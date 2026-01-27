import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationProvider } from "@/contexts/NotificationContext";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://fiestapp.es'),
  title: {
    default: "FiestApp - Vive las Fiestas desde Dentro",
    template: "%s | FiestApp",
  },
  description: "Conecta con locales y descubre experiencias auténticas en las fiestas más emblemáticas de España. Feria de Abril, San Fermín, Las Fallas y más.",
  keywords: [
    "fiestas España",
    "experiencias locales",
    "Feria de Abril",
    "San Fermín",
    "Las Fallas",
    "La Tomatina",
    "turismo auténtico",
    "anfitriones locales",
    "cultura española",
    "festivales España",
  ],
  authors: [{ name: "FiestApp" }],
  creator: "FiestApp",
  publisher: "FiestApp",
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
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "FiestApp",
    title: "FiestApp - Vive las Fiestas desde Dentro",
    description: "Conecta con locales y descubre experiencias auténticas en las fiestas más emblemáticas de España",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "FiestApp - Experiencias auténticas en fiestas españolas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FiestApp - Vive las Fiestas desde Dentro",
    description: "Conecta con locales y descubre experiencias auténticas en las fiestas más emblemáticas de España",
    images: ["/images/og-image.jpg"],
    creator: "@fiestapp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
    languages: {
      "es-ES": "/",
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  category: "travel",
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
            <NotificationProvider>
              <AppWrapper>
                {children}
              </AppWrapper>
              <InstallPrompt />
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
