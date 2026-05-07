export const metadata = {
  title: '3rd Space Coffee — In Store',
};

export default function InStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-950 text-ink">
      {children}
    </div>
  );
}
