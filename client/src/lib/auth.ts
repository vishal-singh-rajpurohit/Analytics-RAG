import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { Provider } from "next-auth/providers/index";
import { apiClient } from "./apiClient";

// Disable Happy Eyeballs autoSelectFamily and prioritize IPv4 to prevent AggregateError (ETIMEDOUT / ENETUNREACH)
// inside Docker containers where IPv6 routing is disabled when connecting to Google OAuth endpoints.
if (typeof process !== "undefined" && typeof window === "undefined") {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const net = require("node:net");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const dns = require("node:dns");
        if (typeof net.setDefaultAutoSelectFamily === "function") {
            net.setDefaultAutoSelectFamily(false);
        }
        if (typeof dns.setDefaultResultOrder === "function") {
            dns.setDefaultResultOrder("ipv4first");
        }
    } catch {
        // ignore if not running in Node environment
    }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const providers: Provider[] = [
    CredentialsProvider({
        name: "Credentials",
        credentials: {
            email: { label: "Email", type: "email" },
            name: { label: "Name", type: "text" },
            password: { label: "Password", type: "password" },
            conformPassword: { label: "Confirm Password", type: "password" },
            isRegister: { label: "Is Register", type: "text" }
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
                throw new Error("Email and password are required.");
            }

            const isRegister = credentials.isRegister === "true" || (Boolean(credentials.name) && Boolean(credentials.conformPassword));

            if (isRegister && credentials.password !== credentials.conformPassword) {
                throw new Error("Passwords do not match.");
            }

            try {
                const { data } = await apiClient.post(`/auth/login-credentials`, {
                    name: credentials.name || null,
                    email: credentials.email.trim().toLowerCase(),
                    password: credentials.password,
                    confirm_password: credentials.conformPassword || null,
                    is_register: isRegister,
                });

                if (!data?.user || !data?.access_token) {
                    throw new Error("Authentication failed: Missing response from server.");
                }

                return {
                    id: String(data.user.id),
                    name: data.user.name,
                    email: data.user.email,
                    image: null,
                    accessToken: data.access_token,
                };
            } catch (err: unknown) {
                const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
                const errorMsg =
                    axiosErr.response?.data?.detail ||
                    axiosErr.message ||
                    "Invalid email or password.";
                throw new Error(errorMsg);
            }
        }
    })
];

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    providers.push(
        GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
        })
    );
}

function isTokenExpired(tokenStr?: string | null): boolean {
    if (!tokenStr) return true;
    try {
        const parts = tokenStr.split(".");
        if (parts.length < 2) return true;
        const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);
        // Expire 60 seconds early to prevent race conditions
        if (payload.exp && Date.now() >= (payload.exp * 1000 - 60000)) {
            return true;
        }
        return false;
    } catch {
        return true;
    }
}

export const AuthOptions: NextAuthOptions = {
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET || "supersecretnextauthkey123456789",
    providers: [
        ...providers,
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Google OAuth authorization check
            if (account?.provider === "google") {
                return Boolean(user?.email);
            }
            return true;
        },
        async jwt({ token, user, account }) {
            // 1. Initial sign-in (credentials or OAuth)
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
                token.image = user.image;
                if ((user as { accessToken?: string }).accessToken) {
                    token.accessToken = (user as { accessToken?: string }).accessToken;
                }
            }

            // 2. Google OAuth initial sign-in: sync with FastAPI to retrieve backend access_token
            if (account && account.provider === "google") {
                try {
                    const { data } = await apiClient.post(`/auth/login-oauth`, {
                        name: user?.name || token.name,
                        email: (user?.email || token.email)?.trim().toLowerCase(),
                        image: user?.image || token.picture,
                        provider_account_id: account.providerAccountId,
                        access_token: account.access_token || null,
                        id_token: account.id_token || null,
                        expires_at: account.expires_at || null
                    });

                    if (data?.access_token) {
                        token.accessToken = data.access_token;
                        if (data.id) {
                            token.id = String(data.id);
                        }
                    }
                } catch (error) {
                    console.error("FastAPI Google sync error in jwt callback:", error);
                }
            }

            // 3. Resilience fallback: if session exists but backend token is missing, sync with FastAPI
            if (!token.accessToken && token.email) {
                try {
                    const { data } = await apiClient.post(`/auth/login-oauth`, {
                        name: token.name || "User",
                        email: String(token.email).trim().toLowerCase(),
                        image: (token.picture as string) || (token.image as string) || null,
                        provider_account_id: (token.sub as string) || String(token.id || "oauth"),
                        access_token: null,
                        id_token: null,
                        expires_at: null
                    });

                    if (data?.access_token) {
                        token.accessToken = data.access_token;
                        if (data.id) {
                            token.id = String(data.id);
                        }
                    }
                } catch (error) {
                    console.error("FastAPI backend token sync fallback error in jwt callback:", error);
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token) {
                let currentAccessToken = token.accessToken as string | undefined;

                // If accessToken is missing or expired, fetch a fresh one from FastAPI
                if ((!currentAccessToken || isTokenExpired(currentAccessToken)) && token.email) {
                    try {
                        const { data } = await apiClient.post(`/auth/login-oauth`, {
                            name: token.name || "User",
                            email: String(token.email).trim().toLowerCase(),
                            image: (token.picture as string) || (token.image as string) || null,
                            provider_account_id: (token.sub as string) || String(token.id || "oauth"),
                            access_token: null,
                            id_token: null,
                            expires_at: null
                        });

                        if (data?.access_token) {
                            currentAccessToken = data.access_token;
                            token.accessToken = data.access_token;
                            if (data.id) {
                                token.id = String(data.id);
                            }
                        }
                    } catch (err) {
                        console.error("FastAPI backend token refresh error in session callback:", err);
                    }
                }

                (session as { accessToken?: string }).accessToken = currentAccessToken;
                if (session.user) {
                    const user = session.user as {
                        id?: string;
                        name?: string | null;
                        email?: string | null;
                        image?: string | null;
                        accessToken?: string;
                    };
                    user.id = (token.id as string) || (session.user as { id?: string }).id;
                    user.name = token.name as string;
                    user.email = token.email as string;
                    user.image = (token.image as string) || (token.picture as string) || user.image;
                    user.accessToken = currentAccessToken;
                }
            }

            return session;
        }
    },
    pages: {
        signIn: "/auth/signup"
    }
};

const handler = NextAuth(AuthOptions);

export { handler as GET, handler as POST };