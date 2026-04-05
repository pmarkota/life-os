import { verifyAuthCode, verifyPKCE } from "@/lib/oauth/utils";

/**
 * OAuth 2.0 Token Endpoint
 *
 * Exchanges an authorization code + PKCE code_verifier for an access token.
 * The issued access token is PETAR_OS_MCP_TOKEN so existing MCP validation
 * works unchanged.
 *
 * Accepts application/x-www-form-urlencoded (OAuth standard) and application/json.
 */
export async function POST(request: Request): Promise<Response> {
  let params: Record<string, string>;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    params = Object.fromEntries(
      Array.from(formData.entries()).map(([k, v]) => [k, String(v)]),
    );
  } else if (contentType.includes("application/json")) {
    params = await request.json();
  } else {
    // Be lenient — try JSON first, fall back to form
    try {
      params = await request.json();
    } catch {
      return oauthError("invalid_request", "Unsupported content type", 400);
    }
  }

  const grantType = params.grant_type;
  const code = params.code;
  const redirectUri = params.redirect_uri;
  const clientId = params.client_id;
  const codeVerifier = params.code_verifier;

  // ── Validate grant type ─────────────────────
  if (grantType !== "authorization_code") {
    return oauthError(
      "unsupported_grant_type",
      "Only authorization_code grant is supported",
      400,
    );
  }

  // ── Validate required params ────────────────
  if (!code) {
    return oauthError("invalid_request", "Missing code parameter", 400);
  }
  if (!codeVerifier) {
    return oauthError("invalid_request", "Missing code_verifier parameter", 400);
  }

  // ── Verify the signed auth code ─────────────
  const payload = verifyAuthCode(code);
  if (!payload) {
    return oauthError(
      "invalid_grant",
      "Authorization code is invalid or expired",
      400,
    );
  }

  // ── Verify redirect_uri matches ─────────────
  if (redirectUri && redirectUri !== payload.redirect_uri) {
    return oauthError(
      "invalid_grant",
      "redirect_uri does not match the authorization request",
      400,
    );
  }

  // ── Verify client_id matches ────────────────
  if (clientId && clientId !== payload.client_id) {
    return oauthError(
      "invalid_grant",
      "client_id does not match the authorization request",
      400,
    );
  }

  // ── Verify PKCE ─────────────────────────────
  if (!verifyPKCE(codeVerifier, payload.code_challenge)) {
    return oauthError(
      "invalid_grant",
      "PKCE verification failed — code_verifier does not match code_challenge",
      400,
    );
  }

  // ── Issue access token ──────────────────────
  // The access token IS PETAR_OS_MCP_TOKEN so existing MCP bearer validation
  // works without any changes.
  const accessToken = process.env.PETAR_OS_MCP_TOKEN;
  if (!accessToken) {
    return oauthError("server_error", "Server misconfigured", 500);
  }

  return new Response(
    JSON.stringify({
      access_token: accessToken,
      token_type: "Bearer",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

function oauthError(
  error: string,
  description: string,
  status: number,
): Response {
  return new Response(
    JSON.stringify({ error, error_description: description }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}
