import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { SkipLink } from "@/components/ui/SkipLink";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import AppWrapper from "@/components/AppWrapper";
import InstallPrompt from "@/components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f4c4a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f4c4a" },
  ],
};

export const metadata: Metadata = {
  title: "FiestApp - Vive las Fiestas desde Dentro",
  description: "Conecta con locales y descubre experiencias auténticas en las fiestas más emblemáticas de España",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FiestApp",
  },
  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/svg+xml" href="/images/icons/favicon.svg" />
        <link rel="icon" type="image/png" sizes="96x96" href="/images/icons/favicon-96x96.png" />
        <link rel="shortcut icon" href="/images/icons/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <ServiceWorkerRegistration />
        <SkipLink />
        <AuthProvider>
          <ToastProvider>
            <AppWrapper>
              {children}
            </AppWrapper>
            <InstallPrompt />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
