import { ActivityLog } from "@/components/dashboard/ActivityLog";

export default function ChroniclesPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-4">
      <h1 className="text-3xl font-headline text-accent">Chronicles</h1>
      <ActivityLog />
    </div>
  );
}
