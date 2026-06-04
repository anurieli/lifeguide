import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeGuide",
  description: "Your space.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // verbose → auth flow logs to the server (Vercel) logs and the browser console.
    // Temporary, paired with the middleware verbose flag, for diagnosing prod login.
    <ConvexAuthNextjsServerProvider verbose>
      <html lang="en">
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
