import type { Metadata, Viewport } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeGuide",
  description: "Your space.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Calm, app-like feel on phones: no rubber-band zoom, fits the notch.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
