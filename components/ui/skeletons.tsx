import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonTable({
  columns = 5,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-4 border-b bg-muted/80 p-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 border-b p-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className="h-4"
              style={{ width: colIdx === 0 ? "40%" : colIdx === columns - 1 ? "20%" : "30%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="h-full overflow-auto bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>

        {/* Stat cards */}
        <div className="mb-6">
          <SkeletonStatCards />
        </div>

        {/* Charts row 1 */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="col-span-2 rounded-lg border bg-card p-4">
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-[300px] w-full" />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-[300px] w-full rounded-full" />
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="col-span-2 rounded-lg border bg-card p-4">
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="h-[250px] w-full" />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-1 h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent sales table */}
        <div className="rounded-lg border bg-card p-4">
          <Skeleton className="mb-4 h-5 w-36" />
          <SkeletonTable columns={5} rows={5} />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border p-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="mt-1.5 h-3 w-3/4" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

export function SkeletonProductGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SkeletonStockPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-40 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Skeleton className="h-10 min-w-[250px] flex-1 rounded-md" />
          <Skeleton className="h-10 w-48 rounded-md" />
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <SkeletonTable columns={7} rows={8} />
      </div>
    </div>
  );
}
