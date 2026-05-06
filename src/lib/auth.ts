import { NextAuthOptions, getServerSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions['adapter'],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          // Check if account is pending approval or deactivated
          // If approvedAt is null, account was never approved (pending)
          // Otherwise, it was approved but later deactivated
          const fullUser = await db.user.findUnique({
            where: { id: user.id },
            select: { approvedAt: true },
          });
          if (!fullUser?.approvedAt) {
            throw new Error('Your account is pending approval. You will be notified when approved.');
          }
          throw new Error('Your account has been deactivated. Please contact an administrator.');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        // Log activity
        await db.activity.create({
          data: {
            type: 'USER_LOGIN',
            description: `${user.name || user.email} logged in`,
            userId: user.id,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, add user data to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      avatar: true,
      isActive: true,
      onboardingCompleted: true,
    },
  });

  return user;
}

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function isManager(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function canManageOrders(role: UserRole): boolean {
  return ['ADMIN', 'MANAGER', 'SALES_REP'].includes(role);
}

export function canRoast(role: UserRole): boolean {
  return ['ADMIN', 'ROASTER', 'PACKAGER'].includes(role);
}

export function canPackage(role: UserRole): boolean {
  return ['ADMIN', 'PACKAGER', 'ROASTER'].includes(role);
}

export function canFulfill(role: UserRole): boolean {
  return ['ADMIN', 'MANAGER', 'ROASTER', 'PACKAGER'].includes(role);
}
