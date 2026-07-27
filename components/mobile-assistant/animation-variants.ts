import { type Variants } from 'framer-motion'

export const viewVariants: Variants = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } },
  exit: { opacity: 0, x: -20, scale: 0.98, transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } },
}

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.3, ease: [0.32, 0.72, 0, 1] },
  }),
  highlighted: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.3, ease: [0.32, 0.72, 0, 1] },
  }),
  hover: { y: -4, scale: 1.02, transition: { duration: 0.2, ease: 'easeOut' } },
  tap: { scale: 0.97, transition: { duration: 0.1 } },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
}

export const headerVariants: Variants = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15 } },
}

export const navigationVariants: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
}
