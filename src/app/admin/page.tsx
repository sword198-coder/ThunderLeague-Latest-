import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquareText } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Link href="/admin/tournaments">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle>Tournaments</CardTitle>
            <CardDescription>
              Create and manage tournaments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up tournaments with mode, tier, BR, dates, and max players.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/accounts">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>
              View registered users and their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              See all registered accounts, roles, and War Thunder info.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/landing-settings">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle>Landing Page Settings</CardTitle>
            <CardDescription>
              Update news text, YouTube and Discord links
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Control what appears on the public landing page.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/notifications">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Send, edit, or delete notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Compose and send announcements to every user.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/leaderboard">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>
              Manage leaderboard entries and player rankings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add, edit, or remove leaderboard entries.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/polls">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle>Polls</CardTitle>
            <CardDescription>
              Create and manage community polls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create, edit, or close polls for user voting.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/support">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5" />
              Support
            </CardTitle>
            <CardDescription>
              Manage user support tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View, reply, and resolve tickets from users.
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
