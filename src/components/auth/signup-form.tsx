"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { signUpSchema, type SignUpData } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TotpEnroll } from "./totp-enroll";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const [step, setStep] = useState<"form" | "totp" | "verify-email">("form");
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
  });

  const checkUsername = async (username: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    return !!data;
  };

  const onSubmit = async (data: SignUpData) => {
    const exists = await checkUsername(data.username);
    if (exists) {
      setError("username", { message: "Username is already taken" });
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
        emailRedirectTo: "https://thunder-league-latest.vercel.app",
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

    if (!authData.session) {
      setUserEmail(data.email);
      setStep("verify-email");
      return;
    }

    setUserId(user.id);
    setStep("totp");
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
    return <TotpEnroll userId={userId} onComplete={() => { router.push("/"); router.refresh(); }} />;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Join ThunderLeague and start competing</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input id="display_name" {...register("display_name")} />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...register("username")} />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
