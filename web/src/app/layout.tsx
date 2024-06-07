import { Suspense } from "react";

import "@/styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SiteHeader } from "@/components/menus/site-header";
import { Sidebar } from "@/components/menus/sidebar";
import { NavbarProvider } from "@/context/NavbarContext";
import { OptionsProvider } from "@/context/OptionsContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <OptionsProvider>
            <NavbarProvider>
              <Suspense>
                <div className="flex">
                  <Sidebar />
                  <div className="flex-1 flex-col">
                    <SiteHeader />
                    <main className="h-auto justify-center content-center py-8 flex flex-col items-center">{children}</main>
                  </div>
                </div>
              </Suspense>
            </NavbarProvider>
          </OptionsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
