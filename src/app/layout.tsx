import "./globals.css";
import "sweetalert2/dist/sweetalert2.min.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import Script from "next/script";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Script
          id="strip-extension-cursor-classes"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var PREFIX = "sweezy-custom-cursor";
                function clean(node) {
                  if (!node || node.nodeType !== 1 || !node.classList) return;
                  Array.prototype.slice.call(node.classList).forEach(function (className) {
                    if (className.indexOf(PREFIX) === 0) node.classList.remove(className);
                  });
                }
                function cleanAll() {
                  clean(document.documentElement);
                  clean(document.body);
                  document.querySelectorAll('[class*="' + PREFIX + '"]').forEach(clean);
                }
                cleanAll();
                var observer = new MutationObserver(function (mutations) {
                  mutations.forEach(function (mutation) {
                    clean(mutation.target);
                    mutation.addedNodes && mutation.addedNodes.forEach(clean);
                  });
                });
                observer.observe(document.documentElement, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                  attributeFilter: ["class"]
                });
                window.setTimeout(function () { observer.disconnect(); cleanAll(); }, 5000);
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
