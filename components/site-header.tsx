"use client";

import Link from "next/link";
import { site } from "@/lib/site";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string };

export function SiteHeader({ categories, collections }: { categories: NavItem[]; collections: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = [
    { href: "/shop", label: "Shop all" },
    { href: "/cart", label: "Bag" },
    ...categories,
    ...collections,
  ];

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link href="/" className="wordmark">
          {site.name}
          <small>Kashmiri shawls</small>
        </Link>
        <nav className="desktop-nav" aria-label="Catalogue">
          <Link href="/shop" aria-current={pathname === "/shop" ? "page" : undefined}>
            Shop all
          </Link>
          {categories.length ? <span className="nav-rule" /> : null}
          {categories.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
          {collections.length ? <span className="nav-rule" /> : null}
          {collections.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="bag-link" href="/cart">
          Bag
        </Link>
        <button className="button-secondary menu-button" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open ? (
        <nav className="wrap mobile-nav" aria-label="Catalogue">
          {links.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
