"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications(userId?: string) {
  const supabase = createClient();

  useEffect(() => {
    if (!userId || !VAPID_PUBLIC_KEY || !("Notification" in window) || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const sub = subscription.toJSON();
        await supabase.from("push_subscriptions").upsert({
          user_id: userId,
          endpoint: sub.endpoint!,
          p256dh: sub.keys!.p256dh,
          auth: sub.keys!.auth,
        });
      } catch {
        // Push not supported
      }
    };

    register();
  }, [userId]);
}
