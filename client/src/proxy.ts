import {NextRequest, NextResponse} from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_ROUTES = ['/auth/signup']
const PROTECTED_ROUTES = ['/me']

export async function proxy(req: NextRequest) {
    const {pathname} = req.nextUrl;

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    const isAuthRoute = AUTH_ROUTES.some(
        (route) => pathname === route
    );

    if (isAuthRoute && token) {
        return NextResponse.redirect(
            new URL("/", req.url)
        );
    }

    const isProtectedRoute = PROTECTED_ROUTES.some(
        (route) => pathname === route
    );

    if (isProtectedRoute && !token) {
        return NextResponse.redirect(
            new URL("/auth/signup", req.url)
        );
    }

    return NextResponse.next();
}

export  const config = {
    matcher: [
        '/auth/:path*',
        '/me/:path*',
    ]
}