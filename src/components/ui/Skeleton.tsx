export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-bg-hover rounded ${className}`} />
}
