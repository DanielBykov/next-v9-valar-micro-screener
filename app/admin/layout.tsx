import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "./_components/sidebar";
import { AuthButton } from "./_components/login-button";
import { AdminAuthProvider } from "./_components/admin-auth-context";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const isAuthed = secret ? await verifySessionToken(token, secret) : false;

  return (
    <AdminAuthProvider isAuthed={isAuthed}>
      <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans">
        <header className="border-b border-[#334155] bg-[#111827]">
          <div className="px-6 h-14 flex items-center gap-4">
            <Link href="/" className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-sm font-semibold tracking-wide">VALAR</span>
            <span className="text-xs text-[#94A3B8] font-mono">Admin</span>
            <AuthButton />
          </div>
        </header>

        <div className="flex">
          <Sidebar />
          <main className="flex-1 px-6 py-10">
            <div className="max-w-4xl mx-auto space-y-8">{children}</div>
          </main>
        </div>
      </div>
    </AdminAuthProvider>
  );
}
