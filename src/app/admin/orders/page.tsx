import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Orders — Admin' };

export default function OrdersAdminPage() {
  return <OrdersClient />;
}
