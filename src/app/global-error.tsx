"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          backgroundColor: "#0a0a0a",
          color: "#e4e4e7",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              color: "#ef4444",
              marginBottom: "0.75rem",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#a1a1aa",
              marginBottom: "1.5rem",
            }}
          >
            {error.message || "A critical error occurred."}
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#27272a",
              color: "#e4e4e7",
              border: "1px solid #3f3f46",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
