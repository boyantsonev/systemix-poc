import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { experimentsSource } from "@/lib/experiments-source";

const SITE_URL = "https://getsystemix.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "/",
    "/audit",
    "/report",
    ...source.getPages().map((page) => page.url),
    ...experimentsSource.getPages().map((page) => page.url),
  ];

  return routes.map((url) => ({ url: `${SITE_URL}${url}` }));
}
