"use client";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0, backgroundColor: "#0F172A" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#F87171", fontFamily: "monospace", fontSize: "0.875rem", marginBottom: "1rem" }}>
              Something went wrong
            </p>
            <button
              onClick={() => reset()}
              style={{
                fontSize: "0.875rem",
                color: "#3B82F6",
                border: "1px solid rgba(59,130,246,0.3)",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
