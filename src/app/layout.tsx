import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { AppChrome } from "@/components/app-chrome";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Super Eagles Supporters Club of Nigeria | The Voice Behind the Eagles",
    template: "%s | Super Eagles Supporters Club",
  },
  description:
    "The official digital home of the Super Eagles Supporters Club of Nigeria — connecting fans, chapters, matches, and community.",
  applicationName: "SESC Nigeria",
  keywords: ["Super Eagles", "Nigeria football", "supporters club", "SESC", "football community"],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "Super Eagles Supporters Club of Nigeria",
    title: "Super Eagles Supporters Club of Nigeria",
    description: "The voice behind the Eagles.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#101412",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <a className="skip-link" href="#main-content">Skip to content</a>
          <AppChrome>{children}</AppChrome>
          <Toaster closeButton position="top-right" richColors theme="dark" />
        </Providers>
      </body>
    </html>
  );
}
