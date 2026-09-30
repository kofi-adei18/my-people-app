import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ProfileProvider } from "@/lib/profile-context";
import { EventsProvider } from "@/lib/events-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "My People — Discover your heritage",
  description:
    "A personalized cultural learning companion. Learn the stories, traditions, language and wisdom that connect you to your Akan heritage.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ProfileProvider>
          <EventsProvider>{children}</EventsProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}