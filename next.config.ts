import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The season page moved; old links keep working.
    return [
      { source: "/showcase", destination: "/cohort1", permanent: true },
      // Hearticles moved from /articles; shared links keep working (and keep their search ranking).
      { source: "/articles/:slug", destination: "/hearticles/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
