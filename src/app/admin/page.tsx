import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquareText, Zap, Link as LinkIcon, Palette, Crown, Megaphone, Flag, Ban, MessageCircle } from "lucide-react";

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
      <Link href="/admin/thunder-points">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Thunder Points
            </CardTitle>
            <CardDescription>
              Give or deduct points from users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage Thunder Points balance for all users.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/referrals">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Referrals
            </CardTitle>
            <CardDescription>
              View referral links and signups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track referrals and verify signups.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/card-backgrounds">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Card Backgrounds
            </CardTitle>
            <CardDescription>
              Upload images/videos, set prices, manage backgrounds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create gradient, image, or video backgrounds for player cards.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/titles">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Titles
            </CardTitle>
            <CardDescription>
              Create and grant custom titles to players
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gold, gradient, or glow titles that appear on player cards.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/announcements">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Announcements
            </CardTitle>
            <CardDescription>
              Send popup cards to all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create popup announcements with text, checkboxes, choices, or text answers.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/reports">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Reports
            </CardTitle>
            <CardDescription>
              Review user-submitted reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View, investigate, and resolve player reports with attached evidence.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/chat-reports">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat Reports
            </CardTitle>
            <CardDescription>
              Dismiss chat message reports from users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View and dismiss reported chat messages from tournaments.
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/bans">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Bans &amp; Warnings
            </CardTitle>
            <CardDescription>
              Ban users or issue warnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Temporarily ban users with a reason and duration, or issue warnings for violations.
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
