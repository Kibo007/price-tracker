import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: () => null, // Actual auth is in auth.ts
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnRegister = nextUrl.pathname === "/register";
      const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
      const isApiRegister = nextUrl.pathname === "/api/register";

      // Allow auth API routes and register API
      if (isApiAuthRoute || isApiRegister) return true;

      // Redirect logged-in users away from login/register pages
      if ((isOnLogin || isOnRegister) && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }

      // Allow login and register pages for unauthenticated users
      if (isOnLogin || isOnRegister) return true;

      // Protect all other routes
      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
  },
};
