"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { signUpSchema, profileSchema, type SignUpData, type ProfileData } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TotpEnroll } from "./totp-enroll";

const COUNTRIES = [
  { code: "", label: "Select country..." },
  { code: "DZ", label: "Algeria" },
  { code: "AR", label: "Argentina" },
  { code: "AU", label: "Australia" },
  { code: "AT", label: "Austria" },
  { code: "BH", label: "Bahrain" },
  { code: "BD", label: "Bangladesh" },
  { code: "BE", label: "Belgium" },
  { code: "BR", label: "Brazil" },
  { code: "BG", label: "Bulgaria" },
  { code: "CA", label: "Canada" },
  { code: "CL", label: "Chile" },
  { code: "CN", label: "China" },
  { code: "CO", label: "Colombia" },
  { code: "HR", label: "Croatia" },
  { code: "CZ", label: "Czech Republic" },
  { code: "DK", label: "Denmark" },
  { code: "EG", label: "Egypt" },
  { code: "FI", label: "Finland" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "GR", label: "Greece" },
  { code: "HK", label: "Hong Kong" },
  { code: "HU", label: "Hungary" },
  { code: "IS", label: "Iceland" },
  { code: "IN", label: "India" },
  { code: "ID", label: "Indonesia" },
  { code: "IR", label: "Iran" },
  { code: "IQ", label: "Iraq" },
  { code: "IE", label: "Ireland" },
  { code: "IL", label: "Israel" },
  { code: "IT", label: "Italy" },
  { code: "JP", label: "Japan" },
  { code: "JO", label: "Jordan" },
  { code: "KE", label: "Kenya" },
  { code: "KW", label: "Kuwait" },
  { code: "LB", label: "Lebanon" },
  { code: "LY", label: "Libya" },
  { code: "MY", label: "Malaysia" },
  { code: "MX", label: "Mexico" },
  { code: "MA", label: "Morocco" },
  { code: "NL", label: "Netherlands" },
  { code: "NZ", label: "New Zealand" },
  { code: "NG", label: "Nigeria" },
  { code: "NO", label: "Norway" },
  { code: "OM", label: "Oman" },
  { code: "PK", label: "Pakistan" },
  { code: "PS", label: "Palestine" },
  { code: "PE", label: "Peru" },
  { code: "PH", label: "Philippines" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "QA", label: "Qatar" },
  { code: "RO", label: "Romania" },
  { code: "RU", label: "Russia" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "RS", label: "Serbia" },
  { code: "SG", label: "Singapore" },
  { code: "SK", label: "Slovakia" },
  { code: "ZA", label: "South Africa" },
  { code: "KR", label: "South Korea" },
  { code: "ES", label: "Spain" },
  { code: "SD", label: "Sudan" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "SY", label: "Syria" },
  { code: "TW", label: "Taiwan" },
  { code: "TN", label: "Tunisia" },
  { code: "TR", label: "Turkey" },
  { code: "UA", label: "Ukraine" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "VN", label: "Vietnam" },
  { code: "YE", label: "Yemen" },
];

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const [step, setStep] = useState<"form" | "profile" | "totp" | "verify-email">("form");
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [hasSession, setHasSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const supabase = createClient();

  const signupForm = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
  });

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  });

  const checkUsername = async (username: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    return !!data;
  };

  const onSubmitSignup = async (data: SignUpData) => {
    const exists = await checkUsername(data.username);
    if (exists) {
      signupForm.setError("username", { message: "Username is already taken" });
      return;
    }

    const { error, data: authData } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          first_name: data.first_name,
          last_name: data.last_name,
          display_name: data.display_name,
        },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const user = authData.user;
    if (!user) {
      toast.error("Failed to create account");
      return;
    }

    // Track referral signup if code present
    if (referralCode) {
      const { data: link } = await supabase
        .from("referral_links")
        .select("id")
        .eq("code", referralCode)
        .maybeSingle();
      if (link) {
        await supabase.from("referral_signups").insert({
          referral_link_id: link.id,
          referred_user_id: user.id,
        });
      }
    }

    setUserId(user.id);
    setHasSession(!!authData.session);
    if (!authData.session) setUserEmail(data.email);
    setStep("profile");
  };

  const onSubmitProfile = async (data: ProfileData) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        war_thunder_username: data.war_thunder_username,
        squadron_name: data.squadron_name,
        discord_username: data.discord_username,
        nationality: data.nationality,
      })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to save profile details");
      return;
    }

    if (hasSession) {
      setStep("totp");
    } else {
      setStep("verify-email");
    }
  };

  if (step === "verify-email") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We sent a confirmation link to <strong>{userEmail}</strong>.
            Please confirm your email first, then log in to set up
            two-factor authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder, or{" "}
            <button
              className="text-primary underline underline-offset-2 cursor-pointer"
              onClick={() => setStep("form")}
            >
              try again with a different email
            </button>
            .
          </p>
          <Button className="w-full" onClick={() => router.push("/auth/login")}>
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "totp") {
    return <TotpEnroll userId={userId} onComplete={() => { window.location.href = "/"; }} />;
  }

  if (step === "profile") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>
            Tell us more about your War Thunder profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="war_thunder_username">War Thunder IGN</Label>
              <Input id="war_thunder_username" {...profileForm.register("war_thunder_username")} placeholder="Your in-game name" />
              {profileForm.formState.errors.war_thunder_username && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.war_thunder_username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="squadron_name">Squadron</Label>
              <Input id="squadron_name" {...profileForm.register("squadron_name")} placeholder="Your squadron name" />
              {profileForm.formState.errors.squadron_name && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.squadron_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord_username">Discord Username</Label>
              <Input id="discord_username" {...profileForm.register("discord_username")} placeholder="your_discord#0000" />
              {profileForm.formState.errors.discord_username && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.discord_username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <select id="nationality" {...profileForm.register("nationality")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              {profileForm.formState.errors.nationality && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.nationality.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Join BPL and start competing</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={signupForm.handleSubmit(onSubmitSignup)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" {...signupForm.register("first_name")} />
              {signupForm.formState.errors.first_name && (
                <p className="text-sm text-destructive">{signupForm.formState.errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" {...signupForm.register("last_name")} />
              {signupForm.formState.errors.last_name && (
                <p className="text-sm text-destructive">{signupForm.formState.errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input id="display_name" {...signupForm.register("display_name")} />
            {signupForm.formState.errors.display_name && (
              <p className="text-sm text-destructive">{signupForm.formState.errors.display_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...signupForm.register("email")} />
            {signupForm.formState.errors.email && (
              <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...signupForm.register("username")} />
            {signupForm.formState.errors.username && (
              <p className="text-sm text-destructive">{signupForm.formState.errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} {...signupForm.register("password")} className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {signupForm.formState.errors.password && (
              <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={signupForm.formState.isSubmitting}>
            {signupForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}