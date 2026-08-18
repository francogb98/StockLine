'use client'

import { Check } from 'lucide-react'

interface Step {
  label: string
}

interface StepIndicatorProps {
  currentStep: number
  steps: Step[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8 px-2 relative">
      {steps.map((step, idx) => {
        const num = idx + 1
        const isDone = currentStep > num
        const isCurrent = currentStep === num

        return (
          <div key={step.label} className="flex flex-col items-center gap-1.5 z-10">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                isDone
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-105'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : num}
            </div>
            <span
              className={`text-[11px] font-medium hidden sm:block ${
                isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        )
      })}
      <div className="absolute top-4 left-6 right-6 h-[2px] bg-slate-100 -z-0" />
    </div>
  )
}
