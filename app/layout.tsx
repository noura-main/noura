import type { Metadata } from "next";
import { Raleway, Inconsolata } from 'next/font/google';
import { UserDataProvider } from "@/lib/context/user-data";
import "./globals.css";

const raleway = Raleway({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Noura | Healthy meals made simple",
  description: "Noura landing page built with Next.js and Tailwind CSS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${raleway.variable} h-full antialiased`}
    >
      <body className="min-h-full"><UserDataProvider>{children}</UserDataProvider></body>
    </html>
  );
}
