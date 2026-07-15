import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Providers from './providers';
import ResponsiveLayout from '../components/ResponsiveLayout';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fulgul: The Spark — Security Automation',
  description:
    'Simulate attacks, detect vulnerabilities, and automate response — security ops by Thinking Minds',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${plusJakarta.className}`}>
        <Providers>
          <ResponsiveLayout>{children}</ResponsiveLayout>
        </Providers>
      </body>
    </html>
  );
}
