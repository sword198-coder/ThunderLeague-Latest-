"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Trophy, BarChart3, Flag, HelpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
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
  const router = useRouter();
  const [showReport, setShowReport] = useState(false);

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
          <DropdownMenuItem onClick={() => router.push("/account")}>
            <User className="mr-2 h-4 w-4" />
            My Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowReport(true)}>
            <Flag className="mr-2 h-4 w-4" />
            Report
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/support")}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Support
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
