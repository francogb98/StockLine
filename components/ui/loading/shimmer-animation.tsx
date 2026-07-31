"use client";

export function ShimmerAnimation() {
  return (
    <defs>
      <linearGradient id="shimmer-entry" x1="0" y1="0" x2="0.25" y2="0">
        <stop offset="0%" stopColor="white" stopOpacity="0" />
        <stop offset="35%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity="0.08" />
        <stop offset="65%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
        <animateTransform
          attributeName="gradientTransform"
          type="translate"
          from="-1.5 0"
          to="3.5 0"
          dur="0.5s"
          begin="0.35s"
          fill="freeze"
        />
      </linearGradient>

      <linearGradient id="shimmer-loop" x1="0" y1="0" x2="0.25" y2="0">
        <stop offset="0%" stopColor="white" stopOpacity="0" />
        <stop offset="35%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity="0.08" />
        <stop offset="65%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
        <animateTransform
          attributeName="gradientTransform"
          type="translate"
          from="-1.5 0"
          to="3.5 0"
          dur="0.5s"
          begin="6s"
          repeatCount="indefinite"
        />
      </linearGradient>
    </defs>
  );
}
