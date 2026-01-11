import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ntsamaela - Peer-to-Peer Package Delivery',
  description: 'Ntsamaela peer-to-peer package delivery platform. Connect drivers with spare capacity to customers needing inter-city parcel delivery.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
