import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TalentRadar",
  description: "AI-powered people search and analytics for IT consultancies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body
        className={`${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 bg-slate-50 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
