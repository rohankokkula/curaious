import type { MetadataRoute } from "next";

/**
 * /cohort1 (the public season page) is unlisted: nothing on the site links to it, and well-behaved
 * crawlers are asked to leave it alone. This is not access control — anyone
 * with the URL can still read it. The page carries `robots: noindex` in its
 * own metadata too, which is what search engines actually honour if they
 * reach it via a shared link.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cohort1", "/showcase", "/dashboard", "/admin", "/api"],
    },
  };
}
