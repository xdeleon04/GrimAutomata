import { ConfigPanel } from "@/components/dashboard/ConfigPanel";

export default function RitualsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h1 className="text-3xl font-headline text-accent">Ritual Core</h1>
      <ConfigPanel />
    </div>
  );
}
