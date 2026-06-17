"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function TotpChallenge({
  factorId,
  onComplete,
}: {
  factorId: string;
  onComplete: () => void;
}) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const supabase = createClient();

  const verify = async () => {
    setVerifying(true);

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      toast.error("Verification failed. Try again.");
      setVerifying(false);
      return;
    }

    const result = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });

    if (result.error) {
      toast.error("Invalid code. Try again.");
      setVerifying(false);
      return;
    }

    toast.success("Verified!");
    onComplete();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="totp-code">Authentication Code</Label>
          <Input
            id="totp-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            autoFocus
          />
        </div>
        <Button
          className="w-full"
          onClick={verify}
          disabled={code.length !== 6 || verifying}
        >
          {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify
        </Button>
      </CardContent>
    </Card>
  );
}
