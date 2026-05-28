import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  const thumbCount = React.useMemo(() => {
    if (Array.isArray(value)) return value.length;
    if (Array.isArray(defaultValue)) return defaultValue.length;
    return 1;
  }, [value, defaultValue]);

  return (
    <SliderPrimitive.Root
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="relative block h-6 w-6 rounded-full border-2 border-coral/60 bg-surface shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 disabled:pointer-events-none disabled:opacity-50 touch-manipulation after:absolute after:inset-[-12px] after:content-['']"
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
