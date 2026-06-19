"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, BellDot, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    let currentUserId: string | undefined;

    const fetchNotifications = async () => {
      currentUserId = (await supabase.auth.getUser()).data.user?.id;
      const userCreatedAt = profile?.created_at;

      let query = supabase
        .from("notifications")
        .select("*")
        .or(currentUserId ? `is_global.eq.true,user_id.eq.${currentUserId}` : "is_global.eq.true");

      if (userCreatedAt) {
        query = query.gte("created_at", userCreatedAt);
      }

      const { data } = await query
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notification;
          if (profile?.created_at && new Date(n.created_at) < new Date(profile.created_at)) return;
          if (n.user_id && n.user_id !== currentUserId) return;
          setNotifications((prev) => { if (prev.some((x) => x.id === n.id)) return prev; return [n, ...prev]; });
          if (!n.read) setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.created_at]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAsRead = async (notif: Notification) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        {unreadCount > 0 ? (
          <>
            <BellDot className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          </>
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b flex items-center justify-between">
            <p className="font-semibold text-sm">Notifications</p>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllAsRead}>
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-2 p-3 border-b last:border-b-0 transition-colors",
                  !n.read && "bg-muted/30"
                )}
              >
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => markAsRead(n)}
                >
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {format(new Date(n.created_at), "MMM d, HH:mm")}
                  </p>
                </button>
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n)}
                    className="shrink-0 mt-0.5 h-2 w-2 rounded-full bg-primary hover:opacity-70 transition-opacity"
                    title="Mark as read"
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
