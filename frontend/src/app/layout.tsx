import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shri Neminath Printers & Packaging — Job Record Register',
  description: 'Production job record management system for Shri Neminath Printers & Packaging',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
