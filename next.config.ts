import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The season page moved; old links keep working.
    return [{ source: "/showcase", destination: "/cohort1", permanent: true }];
  },
};

export default nextConfig;
