import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string;
  size?: "sm" | "default" | "lg" | "xl";
}

export function Spinner({ className, size = "default" }: SpinnerProps) {
  const sizes = {
    sm: "h-4 w-4",
    default: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  }

  return (
    <div className={cn("flex justify-center items-center", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizes[size])} />
    </div>
  )
}
