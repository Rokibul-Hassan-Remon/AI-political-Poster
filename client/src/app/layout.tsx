import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "./user-menu";

const bangla = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "রাইজ টুগেদার — পোস্টার মেকার",
  description: "কয়েক মিনিটে ছাপার উপযোগী রাজনৈতিক পোস্টার বানান",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className={`${bangla.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-neutral-900 font-sans">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
