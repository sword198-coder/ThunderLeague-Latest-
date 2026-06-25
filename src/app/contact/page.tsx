"use client";

import { useState, useEffect } from "react";
import { Mail, MessageCircle, User, Shield, Crown, Server, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Contact = {
  label: string;
  value: string;
  icon: typeof Mail;
};

export default function ContactPage() {
  const [discordUrl, setDiscordUrl] = useState("https://discord.gg/thunderleague");
  const [contacts, setContacts] = useState<Contact[]>([
    { label: "Founder & Developer", value: "ahmedela198", icon: Crown },
    { label: "Co-Founder & Manager 1", value: "manager1", icon: Shield },
    { label: "Co-Founder & Manager 2", value: "manager2", icon: Shield },
  ]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("site_settings").select("value").eq("key", "discord_url").single().then(({ data }) => {
      if (data) setDiscordUrl(data.value);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Get in touch with the ThunderLeague team. We&apos;re here to help!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {contacts.map((contact) => (
            <Card key={contact.label} className="border-border/50 shadow-lg shadow-black/5 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 border border-primary/20 shrink-0">
                  <contact.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{contact.label}</p>
                  <p className="text-lg font-semibold truncate">{contact.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-border/50 shadow-lg shadow-black/5 hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300 md:col-span-2">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                <MessageCircle className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Discord Server</p>
                <p className="text-lg font-semibold truncate">Join our community</p>
              </div>
              <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 shrink-0">
                  <Server className="h-4 w-4" />
                  Join Discord
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              Send us a Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Have a question or issue? Reach out to any of our team members directly on Discord,
              or join our server for community support.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Discord Support
                </Button>
              </a>
              <a href="mailto:support@thunderleague.com">
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email Support
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
