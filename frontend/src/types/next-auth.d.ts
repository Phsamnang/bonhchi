import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username?: string;
    role?: "owner" | "manager" | "staff";
    phone?: string;
    accessToken?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      username?: string;
      role?: "owner" | "manager" | "staff";
      phone?: string;
      accessToken?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: "owner" | "manager" | "staff";
    phone?: string;
    accessToken?: string;
    accessTokenExpires?: number; // ms epoch of backend JWT expiry
  }
}
