import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Life, Drawn — Story Studio", description: "Turn your real memories into hand-drawn short films." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
