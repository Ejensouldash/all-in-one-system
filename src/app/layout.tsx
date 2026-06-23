import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { MainLayout } from "@/components/layout/MainLayout";


export const metadata: Metadata = {
  title: "BubbleO2 - IT Smart Ticketing System",
  description: "Internal IT Ticketing and Management System",
};

export const viewport: import("next").Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-gray-50 text-gray-900 light" style={{ colorScheme: 'light' }}>
      <body className={`${inter.className} min-h-full flex flex-col bg-gray-50 text-gray-900`}>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
