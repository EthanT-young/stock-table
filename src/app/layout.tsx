import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

// next/font downloads the fonts at build time and serves them from our own site,
// so there is no request to Google from the visitor's browser and no layout jump.
// Each font is exposed as a CSS variable that globals.css plugs into the theme.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: "500",
});

export const metadata: Metadata = {
  title: "Stock Table",
  description: "16 familiar companies and 100 days of prices.",
};

/**
 * The root layout wraps every page (like a master template). `children` is the page
 * being shown.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
