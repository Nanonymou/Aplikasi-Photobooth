import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FrameStudio AI — Photobooth & editor frame online",
  description:
    "Potret lewat webcam, susun frame photobooth sesukamu, dan ekspor hasilnya siap cetak — semuanya dalam satu layar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The editor is a dark studio surface, so the whole app opts into the dark
    // token set — including Radix portals, which render outside the page tree.
    <html
      lang="id"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
