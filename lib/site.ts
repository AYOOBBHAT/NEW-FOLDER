import type { Metadata } from "next";

/** Public details the business has confirmed. Do not add a legal name, street address, email, or GSTIN here. */
export const site = {
  name: "Kashmiriloom",
  url: "https://www.kashmiriloom.com",
  phoneDisplay: "+91 95412 68502",
  phoneTel: "+919541268502",
  location: "Srinagar, Jammu & Kashmir, India",
} as const;

export const policyLinks = [
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/contact-us", label: "Contact Us" },
  { href: "/shipping-and-delivery", label: "Shipping & Delivery" },
  { href: "/cancellation-and-refund", label: "Cancellation & returns" },
] as const;

export function policyMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} · ${site.name}`,
      description,
      url: path,
      type: "article",
    },
  };
}
