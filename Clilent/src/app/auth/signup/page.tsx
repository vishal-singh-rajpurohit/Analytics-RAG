"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
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

export default function SignupPage() {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [isRegister, setIsRegister] = useState<boolean>(false);

    const [name, setName] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [conformPassword, setConformPassword] = useState<string>("");
    const [email, setEmail] = useState<string>("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (isRegister) {
                if (!name || !password || !conformPassword || !email) {
                    // Show Error Toast
                    console.log("all values required");
                    return;
                }
                if (password !== conformPassword) {
                    // Show Error Toast
                    console.log("Passwords not matching");
                    return;
                }

                await signIn("credentials", {
                    name,
                    email,
                    password,
                    conformPassword,
                });
            } else {
                if (!password || !email) {
                    // Show Error Toast
                    console.log("all values required");
                    return;
                }

                await signIn("credentials", {
                    name: "",
                    email,
                    password,
                    conformPassword: "",
                });
            }
        } catch (error) {
            console.log("Error in SignIn: ", error);
        }
    }

    async function handleGoogleSignIn() {
        try {
            await signIn("google", { callbackUrl: "/" });
        } catch (error) {
            console.log("Error in Google SignIn: ", error);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-muted/40 px-4 py-8">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-2xl font-bold">
                        {isRegister ? "Create an account" : "Welcome back"}
                    </CardTitle>
                    <CardDescription>
                        {isRegister
                            ? "Enter your details to create your account."
                            : "Enter your details to log in."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Google */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignIn}
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
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                Or continue with email
                            </span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    placeholder="Enter your name"
                                    autoComplete="name"
                                    required
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
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
                                    placeholder={isRegister ? "Create a password" : "Enter your password"}
                                    autoComplete={isRegister ? "new-password" : "current-password"}
                                    className="pr-10"
                                    required
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
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
                                        placeholder="Confirm your password"
                                        autoComplete="new-password"
                                        className="pr-10"
                                        required
                                        onChange={(e) => setConformPassword(e.target.value)}
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

                        <Button type="submit" className="w-full">
                            {isRegister ? "Create Account" : "Login"}
                        </Button>
                    </form>

                    {/* Toggle */}
                    <p className="text-center text-sm text-muted-foreground">
                        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button
                            type="button"
                            className="font-medium text-primary hover:underline"
                            onClick={() => setIsRegister((prev) => !prev)}
                        >
                            {isRegister ? "Login" : "Sign up"}
                        </button>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}