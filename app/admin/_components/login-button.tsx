"use client";

import { LogOut } from "lucide-react";
import { useAdminAuth } from "./admin-auth-context";

export function AuthButton() {
  const { isAuthed, promptLogin, logout } = useAdminAuth();

  if (isAuthed) {
    return (
      <button
        type="button"
        onClick={logout}
        className="ml-auto flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5" />
        Logout
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={promptLogin}
      className="ml-auto text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
    >
      Login
    </button>
  );
}
