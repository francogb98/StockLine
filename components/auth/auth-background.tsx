"use client"

export function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Radial gradients */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-gradient-to-bl from-primary/[0.04] to-transparent blur-3xl rounded-full translate-x-1/4 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-gradient-to-tr from-blue-400/[0.05] to-transparent blur-3xl rounded-full -translate-x-1/4 translate-y-1/4" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[30vw] h-[30vw] bg-gradient-to-r from-primary/[0.02] via-blue-300/[0.02] to-transparent blur-3xl rounded-full" />

      {/* Blurred circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-primary/10 to-blue-400/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-blue-400/[0.08] to-primary/5 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-gradient-to-r from-primary/[0.03] to-blue-300/[0.02] blur-3xl" />

      {/* Geometric shapes */}
      <div className="absolute top-[12%] right-[18%] w-16 h-16 border border-primary/[0.08] rounded-xl rotate-[25deg]" />
      <div className="absolute bottom-[20%] left-[12%] w-14 h-14 border border-primary/[0.08] rounded-lg rotate-[15deg]" />
      <div className="absolute top-[45%] left-[22%] w-8 h-8 border border-primary/[0.08] rotate-[40deg] rounded-md" />
      <div className="absolute top-[35%] right-[22%] w-10 h-10 border border-primary/[0.08] rounded-xl -rotate-[10deg]" />
      <div className="absolute bottom-[30%] right-[30%] w-6 h-6 border border-primary/[0.08] rotate-[60deg] rounded-sm" />
      <div className="absolute top-[60%] left-[35%] w-5 h-5 border border-primary/[0.08] rotate-[20deg] rounded-sm" />
      <div className="absolute top-[8%] left-[40%] w-3 h-3 border border-primary/[0.08] rotate-45 rounded-sm" />
      <div className="absolute bottom-[12%] right-[15%] w-4 h-4 border border-primary/[0.08] rounded-full" />
      <div className="absolute top-[55%] right-[42%] w-5 h-5 border border-primary/[0.07] rotate-[30deg] rounded-sm" />

      {/* Circles */}
      <div className="absolute top-[18%] right-[35%] w-20 h-20 border border-primary/[0.06] rounded-full" />
      <div className="absolute bottom-[15%] left-[25%] w-12 h-12 border border-primary/[0.06] rounded-full" />
      <div className="absolute top-[50%] right-[10%] w-6 h-6 border border-primary/[0.08] rotate-45 rounded-sm" />
      <div className="absolute bottom-[40%] left-[8%] w-4 h-4 border border-primary/[0.08] rotate-[30deg] rounded-sm" />

      {/* Diagonal lines pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.015]" viewBox="0 0 200 200" preserveAspectRatio="none">
        <pattern id="diagonal-lines" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <line x1="0" y1="40" x2="40" y2="0" stroke="currentColor" className="text-primary" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#diagonal-lines)" />
      </svg>

      {/* Connection nodes */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.025]" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <circle cx="200" cy="150" r="2" className="fill-primary" />
        <circle cx="350" cy="280" r="1.5" className="fill-primary" />
        <circle cx="150" cy="400" r="1" className="fill-primary" />
        <circle cx="500" cy="180" r="1.5" className="fill-primary" />
        <circle cx="420" cy="350" r="1" className="fill-primary" />
        <circle cx="280" cy="500" r="2" className="fill-primary" />
        <circle cx="550" cy="450" r="1" className="fill-primary" />
        <circle cx="380" cy="600" r="1.5" className="fill-primary" />

        <line x1="200" y1="150" x2="350" y2="280" stroke="currentColor" className="text-primary" strokeWidth="0.3" />
        <line x1="200" y1="150" x2="500" y2="180" stroke="currentColor" className="text-primary" strokeWidth="0.3" />
        <line x1="350" y1="280" x2="420" y2="350" stroke="currentColor" className="text-primary" strokeWidth="0.3" />
        <line x1="420" y1="350" x2="280" y2="500" stroke="currentColor" className="text-primary" strokeWidth="0.3" />
        <line x1="420" y1="350" x2="550" y2="450" stroke="currentColor" className="text-primary" strokeWidth="0.3" />
        <line x1="280" y1="500" x2="380" y2="600" stroke="currentColor" className="text-primary" strokeWidth="0.3" />
        <line x1="150" y1="400" x2="280" y2="500" stroke="currentColor" className="text-primary" strokeWidth="0.3" />
      </svg>

      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.02]" viewBox="0 0 200 200">
        <pattern id="auth-dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.8" className="fill-primary" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#auth-dot-grid)" />
      </svg>

      {/* Cross lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.015]" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" className="text-primary" strokeWidth="0.5" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" className="text-primary" strokeWidth="0.5" />
      </svg>
    </div>
  )
}
