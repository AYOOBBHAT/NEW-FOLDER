import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["mongodb", "mongoose", "cloudinary"],
  images: {
    remotePatterns: cloudinaryPattern,
  },
};

export default nextConfig;
