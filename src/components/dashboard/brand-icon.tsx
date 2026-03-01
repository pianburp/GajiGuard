import { cn } from "@/lib/utils";

interface BrandIconProps {
  name: string;
  iconUrl?: string | null;
  className?: string;
}

export function BrandIcon({ name, iconUrl, className }: BrandIconProps) {
  if (iconUrl) {
    return (
      <span
        className={cn(
          "shrink-0 rounded-sm border bg-background bg-contain bg-center bg-no-repeat",
          className,
        )}
        style={{ backgroundImage: `url("${iconUrl}")` }}
        role="img"
        aria-label={`${name} icon`}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] font-medium uppercase text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
