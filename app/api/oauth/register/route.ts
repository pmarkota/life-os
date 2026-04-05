import crypto from "crypto";

/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 *
 * Allows MCP clients (like Claude.ai) to register themselves
 * without manual configuration. Since this is a single-user app,
 * we accept all registrations and return a generated client_id.
 */
export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_client_metadata", error_description: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const clientName = (body.client_name as string) || "MCP Client";
  const redirectUris = (body.redirect_uris as string[]) || [];

  // Validate redirect URIs per spec: must be localhost or HTTPS
  for (const uri of redirectUris) {
    try {
      const parsed = new URL(uri);
      const isLocalhost =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (!isLocalhost && parsed.protocol !== "https:") {
        return new Response(
          JSON.stringify({
            error: "invalid_redirect_uri",
            error_description: `Redirect URI must be localhost or HTTPS: ${uri}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    } catch {
      return new Response(
        JSON.stringify({
          error: "invalid_redirect_uri",
          error_description: `Malformed redirect URI: ${uri}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const clientId = crypto.randomUUID();

  const response = {
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
