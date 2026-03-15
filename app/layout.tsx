import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import NavPlayerStats from '@/components/NavPlayerStats';
import './globals.css';

export const metadata: Metadata = {
  title: 'LEO Badminton Club Leaderboard',
  description: 'Track your badminton club rankings with TrueSkill ratings',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-electric-800 border-b border-electric-600">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <Image
                src="https://github.com/user-attachments/assets/35e65497-73e9-4644-b9f9-44432a133c81"
                alt="LEO Badminton Club logo"
                width={48}
                height={48}
                className="rounded-full"
              />
              <span className="text-white font-bold text-xl">LEO Badminton Club</span>
            </Link>
            <div className="flex gap-4 items-center">
              <Link 
                href="/" 
                className="text-white hover:text-coral-400 transition-colors px-3 py-2"
              >
                Weekly
              </Link>
              <Link 
                href="/overall" 
                className="text-white hover:text-coral-400 transition-colors px-3 py-2"
              >
                Overall
              </Link>
              <NavPlayerStats />
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
