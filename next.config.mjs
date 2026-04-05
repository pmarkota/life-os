/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  async rewrites() {
    return [
      {
        // Serve OAuth metadata at the well-known URL (RFC 8414)
        // Next.js ignores dot-prefixed directories, so we rewrite to an API route
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/well-known/oauth-authorization-server",
      },
    ];
  },
};

export default nextConfig;
