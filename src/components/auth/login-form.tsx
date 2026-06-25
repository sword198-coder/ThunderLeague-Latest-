"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginData } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TotpChallenge } from "./totp-challenge";
import { TotpEnroll } from "./totp-enroll";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "totp" | "enroll">("form");
  const [factorId, setFactorId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    let loginEmail = data.identifier;

    if (!loginEmail.includes("@")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", loginEmail)
        .maybeSingle();

      if (!profile) {
        toast.error("Invalid credentials");
        return;
      }
      loginEmail = profile.email;
    }

    const { error, data: authData } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: data.password,
    });

    if (error) {
      if (error.message === "Email not confirmed") {
        toast.error("Please confirm your email first. Check your inbox for the confirmation link.");
      } else {
        toast.error("Invalid credentials");
      }
      return;
    }

    const verifiedFactors = (authData?.user?.factors ?? []).filter(
      (f) => f.factor_type === "totp" && f.status === "verified"
    );

    if (verifiedFactors.length > 0) {
      setFactorId(verifiedFactors[0].id);
      setStep("totp");
    } else {
      setUserId(authData.user.id);
      setStep("enroll");
    }
  };

  if (step === "enroll") {
    return <TotpEnroll userId={userId} onComplete={() => { router.push("/"); router.refresh(); }} />;
  }

  if (step === "totp") {
    return (
      <TotpChallenge
        factorId={factorId}
        onComplete={() => {
          router.push("/");
          router.refresh();
        }}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Username</Label>
            <Input id="identifier" {...register("identifier")} />
            {errors.identifier && (
              <p className="text-sm text-destructive">{errors.identifier.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} {...register("password")} className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/auth/forgot-password")}
                className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 cursor-pointer"
              >
                <Lock className="h-3 w-3 inline mr-0.5" />
                Forgot Password?
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
