self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Battlefront Premier League";
  const options = {
    body: data.message || "",
    icon: "/icon.png",
    badge: "/icon.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
