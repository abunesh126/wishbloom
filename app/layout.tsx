import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WishBloom — Make a little surprise",
  description: "Create and share a personalized surprise website.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}