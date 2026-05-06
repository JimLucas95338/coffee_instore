import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Eco Delight Coffee - In Store',
};

export default function InStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-neutral-950 text-white`}>
      {children}
    </div>
  );
}
