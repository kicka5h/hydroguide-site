import { cn } from "@/lib/utils";

interface WaveDividerProps {
  color?: string;
  flip?: boolean;
  className?: string;
}

export function WaveDivider({
  color = "#f0f9ff",
  flip = false,
  className,
}: WaveDividerProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden leading-none",
        flip && "rotate-180",
        className
      )}
    >
      <svg
        className="relative block w-[200%] h-16 md:h-24"
        viewBox="0 0 2400 120"
        preserveAspectRatio="none"
      >
        <path
          className="animate-wave"
          d="M0,60 C200,120 400,0 600,60 C800,120 1000,0 1200,60 C1400,120 1600,0 1800,60 C2000,120 2200,0 2400,60 L2400,120 L0,120 Z"
          fill={color}
          opacity="0.5"
        />
        <path
          className="animate-wave-slow"
          d="M0,80 C200,20 400,100 600,80 C800,20 1000,100 1200,80 C1400,20 1600,100 1800,80 C2000,20 2200,100 2400,80 L2400,120 L0,120 Z"
          fill={color}
          opacity="0.7"
        />
      </svg>
    </div>
  );
}
