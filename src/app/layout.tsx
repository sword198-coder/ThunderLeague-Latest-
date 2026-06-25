import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { Header } from "@/components/header/header";
import { AnnouncementModal } from "@/components/announcement-modal";
import { BanNotice } from "@/components/ban-notice";
import { WarningAlert } from "@/components/warning-alert";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Battlefront Premier League (BPL)",
  description:
    "The ultimate War Thunder tournament platform. Compete, climb the leaderboard, and prove you're the best pilot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <AnnouncementModal />
          <WarningAlert />
          <BanNotice />
          <Toaster position="bottom-right" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
