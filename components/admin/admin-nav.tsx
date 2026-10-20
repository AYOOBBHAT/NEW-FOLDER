"use client";

import Link from "next/link";
import { site } from "@/lib/site";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/admin/sign-out";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Pieces" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="admin-nav">
      <Link href="/admin" className="wordmark">
        {site.name}
        <small>Catalogue admin</small>
      </Link>
      <nav aria-label="Admin">
        {links.map((link) => {
          const current = link.href === "/admin" ? pathname === "/admin" : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
              {link.label}
            </Link>
          );
        })}
        <Link href="/shop">View shop</Link>
      </nav>
      <SignOutButton />
    </aside>
  );
}
