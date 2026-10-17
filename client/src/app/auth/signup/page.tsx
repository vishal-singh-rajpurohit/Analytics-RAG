"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

function AuthForm() {
    const searchParams = useSearchParams();

    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [isRegister, setIsRegister] = useState<boolean>(false);

    const [name, setName] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [errorMsg, setErrorMsg] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Read error from query string (e.g. from OAuth redirect or external callback)
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            if (error === "OAuthSignin" || error === "OAuthCallback") {
                setErrorMsg("Google sign-in was cancelled or failed. Please try again.");
            } else if (error === "CredentialsSignin") {
                setErrorMsg("Invalid email or password.");
            } else {
                setErrorMsg(decodeURIComponent(error));
            }
        }
    }, [searchParams]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMsg("");

        const cleanEmail = email.trim();

        if (isRegister) {
            if (!name.trim() || !password || !confirmPassword || !cleanEmail) {
                setErrorMsg("All fields are required.");
                return;
            }
            if (password !== confirmPassword) {
                setErrorMsg("Passwords do not match.");
                return;
            }
            if (password.length < 6) {
                setErrorMsg("Password must be at least 6 characters long.");
                return;
            }
        } else {
            if (!password || !cleanEmail) {
                setErrorMsg("Email and password are required.");
                return;
            }
        }

        setIsLoading(true);
        try {
            const res = await signIn("credentials", {
                redirect: false,
                name: isRegister ? name.trim() : "",
                email: cleanEmail,
                password,
                conformPassword: isRegister ? confirmPassword : "",
                isRegister: isRegister ? "true" : "false",
                callbackUrl: "/",
            });

            if (res?.error) {
                setErrorMsg(res.error);
            } else if (res?.ok) {
                // Successful login / register: reload cleanly to workspace
                window.location.href = "/";
            } else {
                setErrorMsg("Failed to authenticate. Please try again.");
            }
        } catch (error: unknown) {
            setErrorMsg(
                (error as Error)?.message ||
                "Failed to sign in. Please verify your credentials."
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGoogleSignIn() {
        setErrorMsg("");
        setIsLoading(true);
        try {
            await signIn("google", { callbackUrl: "/" });
        } catch (error) {
            console.error("Error in Google SignIn:", error);
            setErrorMsg("Failed to start Google sign in.");
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-md shadow-xl border-[#E5EBF2] dark:border-zinc-800 rounded-3xl overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md">
            <CardHeader className="space-y-3 text-center pt-8 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                </div>
                <div>
                    <CardTitle className="text-2xl font-black tracking-tight text-[#19213D] dark:text-white">
                        {isRegister ? "Create Your Account" : "Welcome Back"}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isRegister
                            ? "Sign up to unlock multi-agent data analytics and chart synthesis."
                            : "Enter your credentials to access your dataset analyses."}
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Google OAuth Button */}
                <Button
                    type="button"
                    variant="outline"
                    className="w-full font-medium"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    Continue with Google
                </Button>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-zinc-950 px-2 text-muted-foreground">
                            Or continue with email
                        </span>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium leading-relaxed">
                        {errorMsg}
                    </div>
                )}

                {/* Credentials Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="Your Name"
                                autoComplete="name"
                                value={name}
                                disabled={isLoading}
                                required={isRegister}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            value={email}
                            disabled={isLoading}
                            required
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={isRegister ? "Create a password (min. 6 chars)" : "Enter your password"}
                                autoComplete={isRegister ? "new-password" : "current-password"}
                                className="pr-10"
                                value={password}
                                disabled={isLoading}
                                required
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {isRegister && (
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    className="pr-10"
                                    value={confirmPassword}
                                    disabled={isLoading}
                                    required={isRegister}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide confirm password"
                                            : "Show confirm password"
                                    }
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all" disabled={isLoading}>
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{isRegister ? "Creating account..." : "Signing in..."}</span>
                            </div>
                        ) : (
                            <span>{isRegister ? "Create Account" : "Sign In"}</span>
                        )}
                    </Button>
                </form>

                {/* Toggle Between Login & Register */}
                <p className="text-center text-xs text-muted-foreground pb-2">
                    {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        type="button"
                        className="font-bold text-emerald-600 hover:underline"
                        onClick={() => {
                            setIsRegister((prev) => !prev);
                            setErrorMsg("");
                        }}
                    >
                        {isRegister ? "Sign in" : "Create one"}
                    </button>
                </p>
            </CardContent>
        </Card>
    );
}

export default function SignupPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-[#F5F7FB] dark:bg-zinc-950 px-4 py-8">
            <Suspense fallback={
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                </div>
            }>
                <AuthForm />
            </Suspense>
        </main>
    );
}