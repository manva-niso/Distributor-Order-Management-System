import type { Metadata } from "next";
import "./globals.css";
import WalkthroughGuide from "@/components/walkthrough/WalkthroughGuide";

export const metadata: Metadata = {
  title: "Company A Jabalpur • Wholesale B2B Portal",
  description: "Distributor order portal for Kirana shops, salesmen, and order desk in Jabalpur.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <WalkthroughGuide />
        {children}
      </body>
    </html>
  );
}
