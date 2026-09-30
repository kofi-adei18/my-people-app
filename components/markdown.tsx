import { Fragment, createElement, type ReactNode } from "react";
import { cn } from "cn";

/** Tiny dependency-free renderer for the small subset of markdown the
 *  answers actually use: paragraphs, lists, **bold** and *emphasis*. */
export function Markdown({
  children,
  className,
  inline = false,
}: {
  children: string;
  className?: string;
  inline?: boolean;
}) {
  if (inline) return <InlineRuns text={children} />;

  const blocks = children
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, i) => {
        const listMatch = /^(-|\*)\s+/gm.exec(block);
        if (listMatch) {
          const items = block
            .split(/\n(?=[-\*]\s)/)
            .map((l) => l.replace(/^[-*]\s+/, "").trim())
            .filter(Boolean);
          return (
            <ul key={i} className="list-disc space-y-1 ps-5">
              {items.map((item, j) => (
                <li key={j}>
                  <InlineRuns text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <InlineRuns text={block} />
          </p>
        );
      })}
    </div>
  );
}

const SPLIT = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;

function InlineRuns({ text }: { text: string }) {
  const parts = text.split(SPLIT).filter((p) => p.length > 0);
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push(
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>,
      );
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      nodes.push(<em key={i}>{part.slice(1, -1)}</em>);
    } else {
      nodes.push(<Fragment key={i}>{part}</Fragment>);
    }
  }
  return createElement("span", null, nodes);
}