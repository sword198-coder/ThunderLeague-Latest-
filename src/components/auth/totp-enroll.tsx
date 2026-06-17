"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function TotpEnroll({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete: () => void;
}) {
  const [factorId, setFactorId] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      if (existingFactors?.all) {
        const stale = existingFactors.all.filter(
          (f) => f.factor_type === "totp" && f.status !== "verified"
        );
        await Promise.all(stale.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })));
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      setLoading(false);
      if (error) {
        toast.error(error.message || "Failed to setup 2FA. Try logging out and back in.");
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
  }, []);

  const verifyAndComplete = async () => {
    setVerifying(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      toast.error("Challenge failed");
      setVerifying(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });

    if (verify.error) {
      toast.error("Invalid code. Try again.");
      setVerifying(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ mfa_enrolled: true })
      .eq("id", userId);

    toast.success("2FA enabled successfully!");
    onComplete();
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Set Up Two-Factor Authentication</CardTitle>
        <CardDescription>
          Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {qrCode && (
          <div className="flex justify-center">
            <img
              src={qrCode.startsWith("<svg") ? `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}` : qrCode}
              alt="TOTP QR Code"
              className="w-48 h-48"
            />
          </div>
        )}
        {secret && (
          <div className="space-y-2">
            <Label>Or enter this code manually</Label>
            <div className="flex gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm break-all font-mono">
                {secret}
              </code>
              <Button variant="outline" size="icon" onClick={copySecret}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="code">Enter the 6-digit code from your app</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
          />
        </div>
        <Button
          className="w-full"
          onClick={verifyAndComplete}
          disabled={code.length !== 6 || verifying || !factorId}
        >
          {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify & Complete
        </Button>
      </CardContent>
    </Card>
  );
}
