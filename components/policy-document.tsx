import type { ReactNode } from "react";

export function PolicyDocument({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <article className="legal">
      <div className="wrap legal-doc">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{lede}</p>
        {children}
      </div>
    </article>
  );
}

export function OwnerNote({ children }: { children: ReactNode }) {
  return <span className="legal-gap">{children}</span>;
}
