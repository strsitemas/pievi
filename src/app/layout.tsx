import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Pievi Club", description: "Catálogo Pievi Club" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
