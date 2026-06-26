"use client";

import { Users, MessageCircle, Gamepad2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaintenanceGuard } from "@/components/maintenance-guard";

export default function CommunityPage() {
  return (
    <MaintenanceGuard page="community">
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground mt-1">Connect with other players</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Discord
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Join our Discord server to chat with other players, find teammates, and get updates.</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Social Media
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Follow us on social media for the latest news and tournament highlights.</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-amber-500" />
              Find Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Looking for teammates or practice partners? This feature is coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
    </MaintenanceGuard>
  );
}
