import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-md border border-border bg-space-1/60 px-3.5 py-2.5 text-sm text-star outline-none transition-colors placeholder:text-faint focus:border-aurora-violet/60",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
