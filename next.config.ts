import type { NextConfig } from "next";
import { site } from "./lib/site";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CloudName || "";
const cloudinaryPattern =
  /^[a-z0-9_-]{1,80}$/i.test(cloudName)
    ? [
        {
          protocol: "https" as const,
          hostname: "res.cloudinary.com",
          port: "",
          pathname: `/${cloudName}/image/upload/**`,
          search: "",
        },
      ]
    : [];

const apexHost = new URL(site.url).hostname.replace(/^www\./, "");
const privateSources = ["/admin/:path*", "/api/:path*", "/cart/:path*", "/checkout/:path*", "/orders/:path*"];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["mongodb", "mongoose", "cloudinary"],
  images: {
    remotePatterns: cloudinaryPattern,
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: apexHost }],
        destination: `${site.url}/:path*`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return privateSources.map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
};

export default nextConfig;
