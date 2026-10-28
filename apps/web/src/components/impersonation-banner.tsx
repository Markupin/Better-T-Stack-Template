import { Button } from "@better-t-stack-template/ui/components/button";

import { authClient, authErrorMessage } from "@/lib/auth-client";
import { toast } from "sonner";

export function ImpersonationBanner({ name }: { name: string }) {
  async function stop() {
    const { error } = await authClient.admin.stopImpersonating();
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    // Full reload so every cached query/session switches back to the admin.
    window.location.assign("/admin");
  }

  return (
    <div className="bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center gap-3 px-4 py-2 text-xs">
      <span>
        You are impersonating <strong>{name}</strong>.
      </span>
      <Button size="xs" variant="outline" onClick={stop}>
        Stop impersonating
      </Button>
    </div>
  );
}
