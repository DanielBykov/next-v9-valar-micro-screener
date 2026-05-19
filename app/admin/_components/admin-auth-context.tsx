"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { LoginDialog } from "./login-dialog";

type AdminAuth = {
  isAuthed: boolean;
  promptLogin: () => void;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuth>({ isAuthed: false, promptLogin: () => {}, logout: async () => {} });

export function AdminAuthProvider({ isAuthed: initial, children }: { isAuthed: boolean; children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);

  const promptLogin = useCallback(() => setDialogOpen(true), []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthed(false);
  }, []);

  function handleSuccess() {
    setIsAuthed(true);
    setDialogOpen(false);
  }

  return (
    <AdminAuthContext.Provider value={{ isAuthed, promptLogin, logout }}>
      {children}
      <LoginDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleSuccess} />
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
