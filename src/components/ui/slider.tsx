"use client"

import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/utils/cn"

function Slider({
  className,
  ...props
}: SliderPrimitive.Root.Props<number>) {
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn("relative flex w-full items-center", className)} {...props}>
      {/* The control is 44px tall so the whole strip is draggable with a
          thumb, even though the visible track is thin. touch-none stops the
          page from scrolling sideways while dragging. */}
      <SliderPrimitive.Control className="flex h-11 w-full touch-none items-center">
        <SliderPrimitive.Track className="relative h-2 w-full grow rounded-full bg-input dark:bg-input/60">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className="block size-6 rounded-full border-2 border-primary bg-background shadow-md transition-[box-shadow,scale] duration-150 outline-none focus-visible:ring-4 focus-visible:ring-ring/50 data-dragging:scale-110 data-dragging:ring-4 data-dragging:ring-primary/25 disabled:pointer-events-none disabled:opacity-50"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
