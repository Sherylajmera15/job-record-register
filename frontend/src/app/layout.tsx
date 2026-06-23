import type { Metadata } from 'next';
import './globals.css';
import NoScrollNumberInputs from '@/components/NoScrollNumberInputs';

export const metadata: Metadata = {
  title: 'Shri Neminath Printers & Packaging — Job Record Register',
  description: 'Production job record management system for Shri Neminath Printers & Packaging',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NoScrollNumberInputs />
        {children}
      </body>
    </html>
  );
}
