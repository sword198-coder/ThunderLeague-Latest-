"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthButtons } from "./auth-buttons";
import { UserMenu } from "./user-menu";
import { AdminTab } from "./admin-tab";
import { NotificationsBell } from "./notifications-bell";
import { NavTabs } from "./nav-tabs";

export function Header() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const isAdmin = profile?.role === "super_admin";
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/signup";

  const content = loading ? (
    <div className="flex items-center gap-2">
      <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      <div className="h-8 w-20 bg-muted rounded animate-pulse" />
    </div>
  ) : isAuthPage ? (
    <AuthButtons />
  ) : user ? (
    <>
      <NavTabs />
      {isAdmin && <AdminTab />}
      <NotificationsBell />
      <UserMenu />
    </>
  ) : (
    <AuthButtons />
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="ThunderLeague" className="h-12 w-auto" />
        </Link>
        <nav className="flex items-center gap-2">
          {content}
        </nav>
      </div>
    </header>
  );
}
