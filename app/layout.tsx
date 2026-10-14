import type { Metadata } from "next";
import { Inter, Nunito, Press_Start_2P } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "fly-share",
  description: "Built with Next.js 16, Supabase, and Google Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${nunito.variable} ${pixel.variable}`}>
      <body className="font-inter bg-slate-950 text-slate-100 antialiased min-h-screen">
        <main className="flex flex-col min-h-screen">{children}</main>
      </body>
    </html>
  );
}