import "./globals.css";

export const metadata = {
  title: "Greenmood Content Engine",
  description: "Social media content generator for Greenmood biophilic design",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
