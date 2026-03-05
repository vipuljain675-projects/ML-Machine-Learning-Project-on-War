import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Geopolitical Wargame — AI Conflict Simulator",
  description: "Interactive wargaming dashboard powered by a PyTorch GNN+LSTM model for geopolitical conflict analysis and alliance cascade simulation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
