"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function LoginDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      setPassword("");
      onSuccess();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 backdrop-blur-xs z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[surface-raised] border border-[border-subtle] rounded-lg p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-wide text-[text-primary]">
                Admin Login
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[text-secondary] font-mono mt-1">
                Sign in to access protected actions
              </Dialog.Description>
            </div>
            <Dialog.Close className="text-[text-muted] hover:text-[text-primary] transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs text-[text-secondary]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                className="w-full bg-[surface-base] border border-[border-subtle] rounded px-3 py-2 text-sm text-[text-primary] focus:outline-none focus:border-[text-muted]"
              />
            </label>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[text-primary] text-[surface-base] rounded py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors cursor-pointer"
            >
              {loading ? "Signing in\u2026" : "Sign in"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
