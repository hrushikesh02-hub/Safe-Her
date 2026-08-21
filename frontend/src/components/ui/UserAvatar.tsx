import { useState } from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  role?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  alt?: string;
}

const sizeClasses: Record<string, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-xl",
  "2xl": "size-24 text-3xl",
};

export function UserAvatar({
  src,
  name = "User",
  role,
  size = "md",
  className,
  alt,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const getInitials = (n: string) => {
    if (!n) return "U";
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  // Pick a subtle, pleasing accent based on role
  let bgClass = "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300";
  if (role === "admin") {
    bgClass = "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300";
  } else if (role === "volunteer") {
    bgClass = "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300";
  }

  const hasValidImage = src && !imgError && typeof src === "string" && src.trim() !== "";

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold tracking-tight select-none border transition-all duration-200",
        sizeClasses[size],
        !hasValidImage && bgClass,
        className
      )}
    >
      {hasValidImage ? (
        <img
          src={src}
          alt={alt || name}
          onError={() => setImgError(true)}
          className="size-full object-cover object-center"
          loading="lazy"
        />
      ) : (
        <span className="leading-none">{initials}</span>
      )}
    </div>
  );
}
