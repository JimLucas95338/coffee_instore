import AuditClient from './AuditClient';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Audit Log — Admin' };

export default function AuditAdminPage() {
  return <AuditClient />;
}
