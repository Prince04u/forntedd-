import "./theme.css";
import "./globals.css";
import "./club.css";
import "./legal.css";
import PlatformRoot from "./PlatformRoot";
import { BRAND_NAME } from "@/lib/brand";

export const metadata = {
  title: `${BRAND_NAME} — Gaming Platform`,
  description: "Play Wingo, win real rewards",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="club-body">
        <PlatformRoot>{children}</PlatformRoot>
      </body>
    </html>
  );
}
