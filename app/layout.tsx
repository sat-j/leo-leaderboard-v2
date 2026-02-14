import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Badminton Club Leaderboard',
  description: 'Track your badminton club rankings with TrueSkill ratings',
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
