"use client";

/* ============================================================
   Bharosa — Trust Score dashboard
   Ported from the standalone design export (Plus Jakarta Sans,
   green #10A37C). All styling lives in ./trust-score.css, scoped
   under the `.trust-dashboard` wrapper so it never collides with
   the rest of the app.
   ============================================================ */

import { useEffect, useRef, useState, type SVGProps } from "react";
import "../../app/trust-score.css";

/* ---- tiny inline icons ---- */
type Icon = (p: SVGProps<SVGSVGElement>) => React.JSX.Element;

const Ico = {
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5" /></svg>
  ),
  shieldCheck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  spark: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></svg>
  ),
  arrowUp: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 17 17 7M7 7h10v10" /></svg>
  ),
  trend: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17 9 11l4 4 8-8" /><path d="M17 7h4v4" /></svg>
  ),
  links: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" /><path d="M8.1 11 15.9 7M8.1 13l7.8 4" /></svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
  ),
  users: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 6.5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.7" /></svg>
  ),
  bolt: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
  ),
  qr: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v.01M14 21h.01M17 21h4v-4" /></svg>
  ),
  mic: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
  ),
  bank: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10 12 4l9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 21h18" /></svg>
  ),
  calendar: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  chevron: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6" /></svg>
  ),
  arrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  receipt: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21l2-1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3 5 4.2" /><path d="M8 9h8M8 13h5" /></svg>
  ),
} satisfies Record<string, Icon>;

type IconName = keyof typeof Ico;

/* ---- count-up hook ---- */
function useCountUp(target: number, run: boolean, dur = 1300) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    let start: number | null = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (start == null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setVal(Math.round(ease(p) * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, target, dur]);
  return val;
}

/* ---- circular gauge ---- */
function Gauge({ score, outOf, run }: { score: number; outOf: number; run: boolean }) {
  const R = 98;
  const C = 2 * Math.PI * R;
  const pct = score / outOf;
  const num = useCountUp(score, run);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (run) {
      const t = setTimeout(() => setArmed(true), 80);
      return () => clearTimeout(t);
    }
  }, [run]);
  const offset = armed ? C * (1 - pct) : C;
  return (
    <div className="gauge">
      <svg width="228" height="228" viewBox="0 0 228 228">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#16B488" />
            <stop offset="1" stopColor="#0C8E6B" />
          </linearGradient>
        </defs>
        <circle className="track" cx="114" cy="114" r={R} fill="none" strokeWidth="15" />
        <circle className="prog" cx="114" cy="114" r={R} fill="none" strokeWidth="15" strokeDasharray={C} strokeDashoffset={offset} />
      </svg>
      <div className="gauge-center">
        <div className="gauge-num">{num}</div>
        <div className="gauge-out">out of {outOf}</div>
        <div className="gauge-band">Top 30% band</div>
      </div>
    </div>
  );
}

/* ---- chip ---- */
function Chip({ variant, icon, children }: { variant: string; icon?: IconName; children: React.ReactNode }) {
  const I = icon ? Ico[icon] : null;
  return (
    <span className={`chip chip-${variant}`}>
      {I && <I />}
      {children}
    </span>
  );
}

/* ---- breakdown row ---- */
type Breakdown = {
  icon: IconName;
  name: string;
  cap: string;
  pct: number;
  status: string;
  detail: string;
  grey?: boolean;
};

function BreakdownRow({ icon, name, cap, pct, status, detail, run, delay, grey }: Breakdown & { run: boolean; delay?: number }) {
  const [open, setOpen] = useState(false);
  const [fill, setFill] = useState(0);
  const I = Ico[icon];
  useEffect(() => {
    if (!run) return;
    const t = setTimeout(() => setFill(pct), delay || 0);
    return () => clearTimeout(t);
  }, [run, pct, delay]);
  return (
    <div className={`bd-row${open ? " open" : ""}`} onClick={() => setOpen((o) => !o)}>
      <div className="bd-top">
        <div className={`bd-ico${grey ? " grey" : ""}`}><I /></div>
        <div className="bd-mid">
          <div className="bd-name">{name}</div>
          <div className="bd-cap">{cap}</div>
        </div>
        <span className={`bd-badge${grey ? " todo" : ""}`}>{status}</span>
        <span className="bd-chev"><Ico.chevron /></span>
      </div>
      <div className="bd-bar"><div className={`bd-fill${grey ? " grey" : ""}`} style={{ width: fill + "%" }} /></div>
      <div className="bd-detail" onClick={(e) => e.stopPropagation()}>
        <div className="bd-detail-inner" dangerouslySetInnerHTML={{ __html: detail }} />
      </div>
    </div>
  );
}

/* ---- in-view reveal wrapper ---- */
function Reveal({ children, className = "" }: { children: React.ReactNode | ((seen: boolean) => React.ReactNode); className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reveal = () => setSeen(true);
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) {
      reveal();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    const t = setTimeout(reveal, 2500);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);
  return (
    <div ref={ref} className={`rise ${seen ? "in" : ""} ${className}`}>
      {typeof children === "function" ? children(seen) : children}
    </div>
  );
}

/* ============ data (defaults mirror the design mockup) ============ */
const BREAKDOWN: Breakdown[] = [
  { icon: "users", name: "Community vouches", cap: "2 trusted businesses vouched for you", pct: 72, status: "Done", detail: "Two verified businesses in your area vouched for you. <b>Each new anchor vouch adds the most points</b> — a third could push you into the next band." },
  { icon: "receipt", name: "On-time bill payments", cap: "5 of 6 utility bills paid on time", pct: 84, status: "Done", detail: "You’ve paid <b>5 of your last 6</b> electricity & water bills on time. Keep a clean streak for 3 more months to max this out." },
  { icon: "qr", name: "Monthly sales (QR)", cap: "Steady QR sales every month", pct: 90, status: "Done", detail: "Your QR receipts show <b>steady monthly sales</b> with low volatility. Consistency matters more than size here." },
  { icon: "mic", name: "Business interview", cap: "Completed the business interview", pct: 100, status: "Done", detail: "You completed the voice interview in Nepali. <b>Fully verified</b> — no further action needed." },
];

const ACTIVITY: { icon: IconName; txt: string; time: string }[] = [
  { icon: "shieldCheck", txt: "Anchor vouch received from a verified supplier.", time: "2 hours ago" },
  { icon: "trend", txt: "Trust outlook improved after a utility payment signal.", time: "Yesterday" },
  { icon: "mic", txt: "Voice interview is ready in Nepali, with a typed fallback.", time: "2 days ago" },
];

/* ============ dashboard ============ */
export function TrustScore() {
  const [run, setRun] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRun(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="trust-dashboard">
      <div className="shell">
        {/* ============ HERO ============ */}
        <div className="hero">
          <div className="hero-top">
            <div className="hero-status">
              <Chip variant="soft" icon="shieldCheck">Verified</Chip>
              <span>Trust score</span>
            </div>
            <span className="spacer" />
            <span className="hero-updated"><span className="dot" />Updated just now</span>
          </div>

          <div className="hero-main">
            <div className="score-panel">
              <Gauge score={712} outOf={1000} run={run} />
              <div className="score-chips">
                <Chip variant="green" icon="spark">Growing</Chip>
                <Chip variant="ghost" icon="shield">Low risk</Chip>
              </div>
            </div>

            <div className="hero-r">
              <div className="hero-kicker">Current standing</div>
              <div className="hero-h">Steady &amp; trusted</div>
              <div className="hero-sub">Your 712 score is strong enough to borrow more, at better terms.</div>

              <div className="borrow">
                <div className="borrow-l">
                  <div className="borrow-k"><Ico.bank style={{ width: 14, height: 14 }} /> Pre-qualified to borrow</div>
                  <div className="borrow-v"><span className="cur">NPR</span>120,000</div>
                  <div className="borrow-note">Safe amount today · grows with your score</div>
                </div>
                <button className="btn">See your offer <Ico.arrowRight /></button>
              </div>
            </div>

            <div className="hero-stats" aria-label="Trust signals">
              <div className="hstat">
                <div className="k">This week</div>
                <div className="v">+24 pts</div>
                <div className="d"><Ico.arrowUp /> Trending up</div>
              </div>
              <div className="hstat">
                <div className="k">Evidence links</div>
                <div className="v">38</div>
                <div className="d"><Ico.arrowUp /> +6 new</div>
              </div>
              <div className="hstat">
                <div className="k">Confidence</div>
                <div className="v">74%</div>
                <div className="d"><Ico.arrowUp /> Band tightening</div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ WHAT MAKES UP YOUR SCORE ============ */}
        <Reveal className="card sec">
          {(seen) => (
            <>
              <div className="sec-head">
                <div className="sec-ico"><Ico.bolt /></div>
                <div className="sec-head-wrap">
                  <div className="sec-title">What makes up your trust score</div>
                  <p className="sec-desc">Four things build your score. Tap any one to see what moves it — green means it&apos;s helping you.</p>
                </div>
              </div>
              <div className="bd-list">
                {BREAKDOWN.map((b, i) => (
                  <BreakdownRow key={i} {...b} run={seen} delay={150 + i * 120} />
                ))}
              </div>
            </>
          )}
        </Reveal>

        {/* ============ WHAT YOU CAN BORROW ============ */}
        <Reveal className="card sec borrow-sec">
          {(seen) => (
            <>
              <div className="sec-head">
                <div className="sec-ico"><Ico.bank /></div>
                <div className="sec-head-wrap">
                  <div className="sec-title">What you can borrow</div>
                  <p className="sec-desc">A safe amount based on your score today. It grows as your score grows.</p>
                </div>
              </div>
              <div className="big"><span className="cur">NPR</span>120,000</div>
              <p className="ln">At a score of 800 you could unlock up to <b style={{ color: "var(--ink)" }}>NPR 180,000</b>. You&apos;re <b style={{ color: "var(--ink)" }}>88 points</b> away.</p>

              <div className="range">
                <div className="range-bar">
                  <div className="range-fill" style={{ width: seen ? "67%" : "0%" }} />
                  <div className="range-knob" style={{ left: seen ? "67%" : "0%" }} />
                </div>
                <div className="range-cap"><span>NPR 0</span><span>Today · NPR 120k</span><span>NPR 180k</span></div>
              </div>

              <div className="borrow-terms">
                <div className="term">
                  <div className="tk"><Ico.calendar /> Repayment</div>
                  <div className="tv">Weekly installments</div>
                </div>
                <div className="term">
                  <div className="tk"><Ico.clock /> Grace period</div>
                  <div className="tv">2 weeks</div>
                </div>
                <div className="term">
                  <div className="tk"><Ico.shieldCheck /> Status</div>
                  <div className="tv">Pre-qualified</div>
                </div>
              </div>
            </>
          )}
        </Reveal>

        {/* ============ RECENT ACTIVITY ============ */}
        <Reveal className="card sec">
          <div className="sec-head">
            <div className="sec-ico"><Ico.clock /></div>
            <div className="sec-head-wrap">
              <div className="sec-title">Recent activity</div>
              <p className="sec-desc">The latest signals feeding your <span className="deva">भरोसा</span> score.</p>
            </div>
          </div>
          <div className="act-list">
            {ACTIVITY.map((a, i) => {
              const I = Ico[a.icon];
              return (
                <div className="act" key={i}>
                  <div className="act-dot"><I /></div>
                  <div className="act-body">
                    <div className="act-txt">{a.txt}</div>
                    <div className="act-time">{a.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

export default TrustScore;
