import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "CloudVault — Your cloud, unified", description: "One workspace for every cloud account.", applicationName: "CloudVault", manifest: "/manifest.webmanifest" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
