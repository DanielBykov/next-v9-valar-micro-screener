"use client";

import { createContext, useContext } from "react";

const AdminAuthContext = createContext(false);

export function AdminAuthProvider({ isAuthed, children }: { isAuthed: boolean; children: React.ReactNode }) {
  return <AdminAuthContext.Provider value={isAuthed}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
