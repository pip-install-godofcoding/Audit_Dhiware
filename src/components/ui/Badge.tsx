import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "high" | "medium" | "low" | "covered" | "partial" | "gap" | "stale"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
    high: "border-transparent bg-red-500/20 text-red-500",
    medium: "border-transparent bg-orange-500/20 text-orange-500",
    low: "border-transparent bg-yellow-500/20 text-yellow-500",
    covered: "border-transparent bg-green-500/20 text-green-500",
    partial: "border-transparent bg-blue-500/20 text-blue-500",
    gap: "border-transparent bg-red-500/20 text-red-500",
    stale: "border-transparent bg-gray-500/20 text-gray-400",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
