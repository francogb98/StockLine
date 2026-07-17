import { ImageResponse } from "next/og"

export const runtime = "edge"

export const alt = "StockLine"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 48 48"
          fill="none"
          style={{ marginBottom: 24 }}
        >
          <rect
            x="14"
            y="32"
            width="28"
            height="10"
            rx="4"
            fill="rgba(255,255,255,0.3)"
          />
          <rect
            x="10"
            y="20"
            width="20"
            height="10"
            rx="4"
            fill="rgba(255,255,255,0.55)"
          />
          <rect
            x="6"
            y="8"
            width="12"
            height="10"
            rx="4"
            fill="white"
          />
        </svg>
        <h1
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          StockLine
        </h1>
        <p
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: "rgba(255,255,255,0.85)",
            margin: "12px 0 0 0",
          }}
        >
          Gestión inteligente de stock
        </p>
      </div>
    ),
    { ...size },
  )
}
