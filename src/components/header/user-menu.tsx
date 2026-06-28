"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, User, Flag, HelpCircle, AlertTriangle, Trophy, BarChart3, Vote, Shield, Users, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUnseenWarnings } from "@/components/warning-alert";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReportDialog } from "@/components/report-dialog";

export function UserMenu() {
  const { profile, logout } = useAuth();
  const unseenCount = useUnseenWarnings();
  const router = useRouter();
  const pathname = usePathname();
  const [showReport, setShowReport] = useState(false);
  const isAdmin = profile?.role === "super_admin";

  const navItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Tournaments", icon: Trophy, href: "/tournaments" },
    { label: "Leaderboard", icon: BarChart3, href: "/leaderboard" },
    { label: "Votes", icon: Vote, href: "/votes" },
    { label: "Support", icon: HelpCircle, href: "/support" },
{ label: "Community", icon: Users, href: "/community" },
  ] as const;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : profile?.username?.slice(0, 2).toUpperCase() ?? "TL";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer">
          <div className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {unseenCount > 0 && (
              <div className="absolute -top-0.5 -right-0.5 bg-yellow-500 rounded-full p-0.5 shadow" title={`${unseenCount} warning${unseenCount > 1 ? "s" : ""}`}>
                <AlertTriangle className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{profile?.display_name || profile?.username}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {profile?.email}
                </span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <div className="sm:hidden">
            {navItems.map(({ label, icon: Icon, href }) => (
              <DropdownMenuItem key={href} onClick={() => router.push(href)}
                className={cn(pathname === href || pathname.startsWith(href + "/") ? "bg-muted" : "")}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </DropdownMenuItem>
            ))}
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => router.push("/admin")}>
                  <Shield className="mr-2 h-4 w-4 text-amber-400" />
                  <span className="text-amber-400">Admin</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
          </div>
          <DropdownMenuItem onClick={() => router.push("/account")}>
            <User className="mr-2 h-4 w-4" />
            My Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowReport(true)}>
            <Flag className="mr-2 h-4 w-4" />
            Report
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog open={showReport} onOpenChange={setShowReport} />
    </>
  );
}
