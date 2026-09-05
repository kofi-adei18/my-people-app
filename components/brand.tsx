import { cn } from "@/lib/utils";
import Link from "next/link";

/** Minimal sankofa-inspired mark: a bird with head turned back toward its
 *  origin, tracing a small circle — "go back and fetch it." One quiet motif,
 *  used sparingly, never repeated across patterns. */
export function SankofaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <path
        d="M16 8.5c-6.5 2.2-9 8.4-7 15.4C10.9 30.8 18 35 27 35l6.5-2.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M40 14c-3.8-1.7-7.8-1.4-10.3 0.9-1.7 1.6-2.3 4-1.2 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="19.5"
        cy="24"
        r="4.75"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}

export function BrandLogo({
  href = "/",
  className,
  markClassName,
}: {
  href?: string;
  className?: string;
  markClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-lg",
        className,
      )}
    >
      <SankofaMark
        className={cn(
          "text-gold transition-transform duration-500 ease-out group-hover:-rotate-6",
          markClassName,
        )}
      />
      <span className="font-display text-xl tracking-tight text-foreground">
        My People
      </span>
    </Link>
  );
}