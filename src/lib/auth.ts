import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"
import type { UserRole } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        // Check if user is active and allowed to sign in.
        if (!user.isActive || user.status === "BLOCKED") {
          return null
        }

        const isValid = await compare(credentials.password as string, user.passwordHash)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },
})

// Permission helpers
export function canManageProducts(role: UserRole): boolean {
  return ["SUPERADMIN", "OWNER", "ADMIN"].includes(role)
}

export function canManageOrders(role: UserRole): boolean {
  return ["SUPERADMIN", "OWNER", "ADMIN"].includes(role)
}

export function canManageCustomers(role: UserRole): boolean {
  return ["SUPERADMIN", "OWNER", "ADMIN"].includes(role)
}

export function canAccessAdmin(role: UserRole): boolean {
  return ["SUPERADMIN", "OWNER", "ADMIN"].includes(role)
}
