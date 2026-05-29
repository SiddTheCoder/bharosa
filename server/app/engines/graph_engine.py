"""Sensor 1 — social graph: trust propagation + fraud-ring detection.

Trust *flows* from verified anchors via personalized PageRank, so a vouch from a
trusted merchant is worth more than one from a nobody. Closed reciprocal rings
with no anchor inflow are detected and their vouches discounted to ~0.
"""
from __future__ import annotations

import math

import networkx as nx

from app.db.mongo import get_db
from app.models.schemas import Evidence

EDGE_WEIGHT = {"vouch": 1.0, "guarantee": 2.0}
SIGNAL_SCALE = 0.4          # saturation scale for mapping trust signal -> [0,1]
DENSITY_THRESHOLD = 0.5     # internal edge density that looks "too tight"


async def build_graph() -> nx.DiGraph:
    """Directed weighted vouch graph: nodes=merchants, edges=vouches."""
    db = get_db()
    G = nx.DiGraph()
    async for m in db.merchants.find({}):
        G.add_node(m["id"], is_anchor=bool(m.get("is_anchor")), name=m.get("name"))
    async for v in db.vouches.find({}):
        w = EDGE_WEIGHT.get(v["kind"], 1.0)
        if G.has_edge(v["from_id"], v["to_id"]):
            G[v["from_id"]][v["to_id"]]["weight"] += w
        else:
            G.add_edge(v["from_id"], v["to_id"], weight=w)
    return G


def propagate_trust(G: nx.DiGraph, anchors: list[str]) -> dict[str, float]:
    """Personalized PageRank seeded on anchors, normalized to 0..1 by the max."""
    if G.number_of_nodes() == 0:
        return {}
    present = [a for a in anchors if a in G]
    personalization = {a: 1.0 for a in present} if present else None
    raw = nx.pagerank(G, alpha=0.85, personalization=personalization, weight="weight")
    top = max(raw.values()) if raw else 0.0
    if top <= 0:
        return {n: 0.0 for n in raw}
    return {n: v / top for n, v in raw.items()}


def _raw_pagerank(G: nx.DiGraph, anchors: list[str]) -> dict[str, float]:
    present = [a for a in anchors if a in G]
    personalization = {a: 1.0 for a in present} if present else None
    return nx.pagerank(G, alpha=0.85, personalization=personalization, weight="weight")


def detect_fraud_rings(G: nx.DiGraph, anchors: list[str]) -> list[set[str]]:
    """Flag internally-dense / reciprocal communities with ~zero anchor inflow."""
    if G.number_of_nodes() == 0:
        return []

    raw = _raw_pagerank(G, anchors)
    n = G.number_of_nodes()
    eps = (sum(raw.values()) / n) * 0.1 if n else 0.0   # 10% of average mass
    anchor_set = set(anchors)

    # Reciprocal 2-cycles (A<->B) — strong manipulation signal.
    reciprocal_nodes: set[str] = set()
    for u, v in G.edges():
        if G.has_edge(v, u):
            reciprocal_nodes.add(u)
            reciprocal_nodes.add(v)

    flagged: list[set[str]] = []
    undirected = G.to_undirected()
    communities = nx.community.louvain_communities(undirected, weight="weight", seed=42)

    for comm in communities:
        comm = set(comm) - anchor_set
        if len(comm) < 3:
            continue
        sub = G.subgraph(comm)
        possible = len(comm) * (len(comm) - 1)
        density = sub.number_of_edges() / possible if possible else 0.0
        anchor_inflow = sum(raw.get(node, 0.0) for node in comm)
        has_reciprocal = bool(comm & reciprocal_nodes)
        if (density > DENSITY_THRESHOLD or has_reciprocal) and anchor_inflow < eps:
            flagged.append(comm)

    return flagged


async def social_evidence(merchant_id: str) -> tuple[list[Evidence], dict]:
    """Return (evidence, fraud_report). fraud_report = {in_ring, ring_size}."""
    db = get_db()
    anchors = [m["id"] async for m in db.merchants.find({"is_anchor": True})]
    G = await build_graph()

    fraud_report = {"in_ring": False, "ring_size": 0}
    if merchant_id not in G:
        return [], fraud_report

    rings = detect_fraud_rings(G, anchors)
    for ring in rings:
        if merchant_id in ring:
            fraud_report = {"in_ring": True, "ring_size": len(ring)}
            break

    inbound = list(G.in_edges(merchant_id, data=True))
    if not inbound:
        return [], fraud_report

    trust = propagate_trust(G, anchors)
    flagged_nodes = set().union(*rings) if rings else set()

    # Valid vouchers = not themselves inside a flagged ring.
    valid = [(src, d) for src, _, d in inbound if src not in flagged_nodes]
    n_valid = len(valid)
    signal = sum(trust.get(src, 0.0) * d.get("weight", 1.0) for src, d in valid)
    avg_voucher_trust = (
        sum(trust.get(src, 0.0) for src, _ in valid) / n_valid if n_valid else 0.0
    )

    value01 = 1.0 - math.exp(-signal / SIGNAL_SCALE)   # saturating 0..1

    if fraud_report["in_ring"]:
        # Discount vouches from a detected ring to ~0.
        evidence = [Evidence(
            source="social",
            label=f"vouches discounted — fraud ring detected (size {fraud_report['ring_size']})",
            value=0.0,
            reliability=0.0,
            k=0.0,
            action_type="vouch",
        )]
        return evidence, fraud_report

    if n_valid == 0:
        return [], fraud_report

    evidence = [Evidence(
        source="social",
        label=f"{n_valid} trusted vouch(es), anchor-traceable",
        value=2 * value01 - 1,
        reliability=max(0.0, min(1.0, avg_voucher_trust)),
        k=float(n_valid),
        action_type="vouch",
    )]
    return evidence, fraud_report
