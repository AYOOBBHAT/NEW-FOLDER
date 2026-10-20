import type { MetadataRoute } from "next";
import { policyLinks, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/shop", ...policyLinks.map((link) => link.href)];
  return paths.map((path) => ({
    url: new URL(path, site.url).toString(),
    changeFrequency: path === "/" || path === "/shop" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
