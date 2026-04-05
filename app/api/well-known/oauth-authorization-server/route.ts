import { NextRequest } from "next/server";
import { getBaseUrl } from "@/lib/oauth/utils";

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 *
 * Clients discover auth endpoints here before falling back to defaults.
 * Served at /.well-known/oauth-authorization-server via next.config rewrite.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const baseUrl = getBaseUrl(request);

  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    registration_endpoint: `${baseUrl}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
  };

  return new Response(JSON.stringify(metadata), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
