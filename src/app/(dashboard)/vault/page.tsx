import { CredentialManager } from "@/components/dashboard/CredentialManager";

export default function VaultPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h1 className="text-3xl font-headline text-accent">Vault Storage</h1>
      <CredentialManager />
    </div>
  );
}
