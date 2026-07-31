"use client";

import { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { CloudAnimation } from "./cloud-animation";
import { BarAnimation } from "./bar-animation";
import { ParticlesAnimation } from "./particles-animation";
import { ShimmerAnimation } from "./shimmer-animation";

const CLOUD_PATH =
  "M2410 4014 c-14 -2 -56 -9 -95 -15 -171 -26 -338 -98 -474 -204 -163 -125 -311 -339 -366 -528 -18 -62 -19 -62 -115 -72 -132 -14 -278 -58 -359 -109 -22 -14 -43 -26 -46 -26 -3 0 -29 -17 -58 -39 -196 -146 -327 -347 -389 -601 -20 -85 -17 -377 6 -460 46 -167 94 -269 183 -387 128 -170 321 -297 525 -347 71 -18 245 -36 265 -29 10 4 13 37 13 133 l0 128 -77 7 c-174 15 -324 78 -444 187 -89 81 -182 237 -215 363 -25 96 -25 286 -1 375 70 255 265 450 523 521 65 18 104 22 224 21 87 0 150 4 157 10 7 6 13 22 13 37 0 44 48 217 79 285 167 369 575 560 961 449 126 -36 279 -130 367 -225 83 -90 155 -219 189 -335 9 -32 21 -61 27 -64 5 -4 44 -10 86 -14 266 -24 449 -97 598 -238 124 -118 209 -269 243 -430 18 -90 14 -269 -9 -359 -71 -277 -257 -476 -531 -567 l-55 -18 0 -129 0 -129 35 3 c157 15 360 119 513 262 142 132 262 357 302 568 17 89 20 306 5 384 -46 234 -146 426 -304 584 -173 171 -348 260 -604 305 l-73 12 -40 86 c-22 47 -51 100 -65 118 -13 17 -24 36 -24 41 0 5 -43 54 -96 110 -163 173 -344 274 -572 317 -79 15 -258 27 -302 19z";

interface AnimatedLogoProps {
  className?: string;
}

function StaticLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 5000 5000"
      className={className}
      aria-label="StockLine logo"
    >
      <g transform="translate(0,5000) scale(1,-1)">
        <path fill="#0052FF" d={CLOUD_PATH} />
      </g>
      <rect x="2000" y="2500" width="220" height="800" rx="60" fill="#00C853" />
      <rect
        x="2390"
        y="2100"
        width="220"
        height="1200"
        rx="60"
        fill="#00C853"
      />
      <rect
        x="2780"
        y="1700"
        width="220"
        height="1600"
        rx="60"
        fill="#00C853"
      />
    </svg>
  );
}

export function AnimatedLogo({ className }: AnimatedLogoProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || prefersReducedMotion) {
    return <StaticLogo className={className} />;
  }

  return (
    <svg
      viewBox="0 0 5000 5000"
      className={className}
      aria-label="StockLine logo"
    >
      <ShimmerAnimation />
      <CloudAnimation />
      <BarAnimation />
      <ParticlesAnimation />
    </svg>
  );
}
