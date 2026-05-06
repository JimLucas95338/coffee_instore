import UsersClient from './UsersClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  return <UsersClient currentUserId={session?.user.id ?? ''} />;
}
