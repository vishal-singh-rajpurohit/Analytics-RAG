import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { Provider } from "next-auth/providers/index";
import { apiClient } from "./apiClient";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET



const providers: Provider[] = [
    CredentialsProvider({
        name: "Credentials",
        credentials: {
            email: { label: 'Email', type: "email" },
            name: { label: 'Name', type: "text" },
            password: { label: 'Password', type: "password" },
            conformPassword: { label: 'Conform Password', type: "password" }
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials.password) return null
            const is_new: boolean = credentials.name ? true : false

            if (is_new && credentials.password !== credentials.conformPassword) return null

            // console.log('credentials', credentials)

            const { data } = await apiClient.post(`/auth/login-credentials`, {
                name: credentials.name,
                email: credentials.email,
                password: credentials.password,
                confirm_password: credentials.conformPassword
            })

            if (!data?.user || !data?.access_token) return null

            return {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                image: null,
                accessToken: data.access_token,
            }
        }
    })
]

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    providers.push(
        GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
        })
    );
}

export const AuthOptions: NextAuthOptions = {
    session: {
        strategy: 'jwt'
    },
    providers: [
        ...providers,

    ],
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            if (account?.provider === 'google') {
                try { 
                    const { data } = await apiClient.post(`/auth/login-oauth`, {
                        name: user.name,
                        email: user.email,
                        image: user.image,
                        provider_account_id: account.providerAccountId,
                        access_token: account.access_token,
                        id_token: account.id_token,
                        expires_at: account.expires_at
                    })

                    if (!data) return false

                    user.id = data.id;
                    (user as any).backendToken = data.access_token;

                    return true;
                } catch (error) {
                    console.error("FastAPI Google sync error:", error);
                    return false
                }
            }

            return true

        },
        async jwt({ user, account, token }) {
            if (user) {
                token.id = user.id
                token.name = user.name
                token.email = user.email
                token.image = user.image
                token.accessToken = (user as typeof user & { accessToken: string }).accessToken
            }

            return token
        },
        async session({ session, token, user }) {
            const jwtToken = token as any

            if (jwtToken && session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).name = token.name as string;
                (session.user as any).email = token.email as string;
                (session.user as any).image = token.image as string;
            }

            return session
        }
    },
    pages: {
        signIn: "/auth/signup"
    }
}

const handler = NextAuth(AuthOptions)

export { handler as GET, handler as POST }