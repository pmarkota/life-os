"use client";

import { useActionState } from "react";
import { login, signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

interface ActionState {
  error?: string;
}

const initialState: ActionState = {};

function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return login(formData) as Promise<ActionState>;
}

function signupAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return signup(formData) as Promise<ActionState>;
}

export default function LoginPage() {
  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initialState,
  );
  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initialState,
  );

  const error = loginState?.error || signupState?.error;
  const isPending = loginPending || signupPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#0EA5E9]/[0.04] blur-[120px]" />
      </div>

      <Card className="login-card relative w-full max-w-[400px] border-[#27272A] bg-[#18181B]/80 backdrop-blur-xl">
        <CardHeader className="items-center space-y-4 pb-2 pt-10">
          {/* Terminal cursor / system indicator */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="block h-2 w-2 rounded-full bg-[#0EA5E9] login-pulse" />
            <span className="text-xs font-mono tracking-widest text-[#A1A1AA] uppercase">
              System Online
            </span>
          </div>

          {/* PETAR OS branding */}
          <h1 className="login-title text-3xl font-bold tracking-tight text-[#FAFAFA]">
            PETAR <span className="text-[#0EA5E9]">OS</span>
          </h1>

          <p className="text-sm text-[#71717A] tracking-wide">
            Life & Work Command Center
          </p>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-6">
          <form className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-mono tracking-wider text-[#A1A1AA] uppercase"
              >
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="petar.markota@gmail.com"
                required
                autoComplete="email"
                disabled={isPending}
                className="h-11 border-[#27272A] bg-[#09090B] text-[#FAFAFA] placeholder:text-[#3F3F46] focus-visible:ring-[#0EA5E9]/50 focus-visible:border-[#0EA5E9]/50"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-mono tracking-wider text-[#A1A1AA] uppercase"
              >
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={isPending}
                className="h-11 border-[#27272A] bg-[#09090B] text-[#FAFAFA] placeholder:text-[#3F3F46] focus-visible:ring-[#0EA5E9]/50 focus-visible:border-[#0EA5E9]/50"
              />
            </div>

            {/* Error display */}
            {error && (
              <div className="rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 px-4 py-3">
                <p className="text-sm text-[#EF4444]">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <Button
                formAction={loginFormAction}
                disabled={isPending}
                className="h-11 w-full bg-[#0EA5E9] text-[#09090B] font-semibold hover:bg-[#0284C7] transition-all duration-200"
              >
                {loginPending ? (
                  <span className="flex items-center gap-2">
                    <span className="login-spinner h-4 w-4 rounded-full border-2 border-[#09090B]/30 border-t-[#09090B]" />
                    Authenticating...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>

              <Button
                formAction={signupFormAction}
                variant="outline"
                disabled={isPending}
                className="h-11 w-full border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46] hover:bg-[#27272A]/50 transition-all duration-200"
              >
                {signupPending ? (
                  <span className="flex items-center gap-2">
                    <span className="login-spinner h-4 w-4 rounded-full border-2 border-[#A1A1AA]/30 border-t-[#A1A1AA]" />
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </form>

          {/* Footer accent line */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#27272A] to-transparent" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-[#3F3F46] uppercase">
              Elevera Studio
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#27272A] to-transparent" />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
