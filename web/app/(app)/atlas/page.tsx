import { TrustAtlas } from "@/components/atlas/TrustAtlas";

export default function AtlasPage() {
  return <main className="space-y-4"><div><h1 className="text-3xl font-semibold">Trust Atlas</h1><p className="text-muted-foreground">Network evidence, anchors, and fraud clusters.</p></div><TrustAtlas /></main>;
}
