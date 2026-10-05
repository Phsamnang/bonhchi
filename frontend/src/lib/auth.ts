import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET || "super_secret_bonchi_jwt_key_2026_at_least_32_characters_long";

/** Read the `exp` claim (seconds) from the backend JWT without verifying it */
function getJwtExpiryMs(token: string): number | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Bonchi Local Auth",
      credentials: {
        username: { label: "Username / Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username and password are required");
        }

        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          const data = await res.json();

          if (!res.ok || !data.user) {
            throw new Error(data.error || "Authentication failed");
          }

          return {
            id: String(data.user.id),
            name: data.user.name,
            username: data.user.username,
            role: data.user.role,
            phone: data.user.phone,
            accessToken: data.access_token,
          };
        } catch (error: any) {
          console.error("Authorize error:", error.message);
          throw new Error(error.message || "Cannot connect to auth server");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.phone = user.phone;
        token.accessToken = user.accessToken;
        token.accessTokenExpires = user.accessToken ? getJwtExpiryMs(user.accessToken) : undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as any;
        session.user.phone = token.phone as string;
        session.user.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: AUTH_SECRET,
};
