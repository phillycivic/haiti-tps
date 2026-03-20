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
  title: "Protect TPS for 350,000 Haitians | Discharge Petition Action",
  description:
    "Find your representative, check if they've signed the discharge petition (H.Res. 965), and call them to support Temporary Protected Status for Haiti.",
  openGraph: {
    title: "Protect TPS for 350,000 Haitians",
    description:
      "Look up your rep and call them to sign the discharge petition for Haiti TPS.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
