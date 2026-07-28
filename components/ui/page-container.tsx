import * as React from 'react'

import { cn } from '@/lib/utils'

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: string
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, maxWidth = 'max-w-7xl', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('h-full overflow-auto bg-background p-6', className)}
      {...props}
    >
      <div className={cn('mx-auto', maxWidth)}>{children}</div>
    </div>
  ),
)
PageContainer.displayName = 'PageContainer'

export { PageContainer }
