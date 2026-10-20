import Link from "next/link";
import { policyLinks, site } from "@/lib/site";

type NavItem = { href: string; label: string };

export function SiteFooter({ categories, collections }: { categories: NavItem[]; collections: NavItem[] }) {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <h2>{site.name}</h2>
          <p>A catalogue of Kashmiri shawls, with attributes kept separate from how a piece is grouped.</p>
        </div>
        <div>
          <h2>Shop</h2>
          <Link href="/shop">Shop all</Link>
        </div>
        <div>
          <h2>Categories</h2>
          {categories.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Collections</h2>
          {collections.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="footer-policies">
          <h2>Policies</h2>
          {policyLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="wrap footer-note">Each piece lists fibre, craft, and origin only when those details have been verified.</div>
    </footer>
  );
}
