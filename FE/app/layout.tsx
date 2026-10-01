import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SARPRAS POKADA - Politeknik Karya Husada",
  description: "Sistem Manajemen Sarana & Prasarana Kampus Politeknik Karya Husada",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("app-theme");if(!t){try{var s=JSON.parse(localStorage.getItem("appSettings")||"{}");t=s&&s.theme;}catch(e){}}if(t!=="dark"&&t!=="light"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}var p=location.pathname;var scoped=/^\\/user(?:\\/|$)/.test(p)||/^\\/admin(?:\\/|$)/.test(p);document.documentElement.classList.toggle("dark",t==="dark"&&scoped);document.documentElement.style.colorScheme=t==="dark"&&scoped?"dark":"light";}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
