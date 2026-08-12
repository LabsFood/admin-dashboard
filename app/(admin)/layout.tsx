"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChefHat } from "lucide-react";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import MobileNav from "@/components/admin/MobileNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady, isAdmin, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    // Le middleware protège déjà ces routes ; on double la garde côté client et
    // on refuse les comptes authentifiés qui n'ont pas le rôle admin.
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (!isAdmin) {
      signOut();
      router.replace("/login?error=forbidden");
    }
  }, [isReady, isAuthenticated, isAdmin, signOut, router]);

  if (!isReady || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-navy text-white">
            <ChefHat className="h-6 w-6" />
          </span>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Chargement de la console…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
