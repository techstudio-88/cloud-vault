"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("CloudVault root error", error); }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#090b12", color: "#f5f6fb", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 440, textAlign: "center", border: "1px solid #ffffff20", borderRadius: 18, padding: 28, background: "#151827" }}>
            <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>CloudVault needs to reload</h1>
            <p style={{ color: "#9ca3b5", lineHeight: 1.6 }}>An unexpected application error occurred. Please retry. Detailed server diagnostics are kept out of this page.</p>
            {error.digest ? <p style={{ color: "#647087", fontSize: 12 }}>Reference: {error.digest}</p> : null}
            <button onClick={() => reset()} style={{ marginTop: 12, border: 0, borderRadius: 10, padding: "11px 18px", background: "#7654df", color: "white", cursor: "pointer" }}>Reload CloudVault</button>
          </section>
        </main>
      </body>
    </html>
  );
}
