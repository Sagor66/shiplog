/**
 * Response shape for `GET /auth/me`. Intentionally narrow — only the
 * fields the frontend needs to render the user chrome. Internal fields
 * (sessions, tokens, OAuth state) live on Better Auth's own session
 * endpoint, not here.
 */
export interface MeResponseDto {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: boolean;
  };
  session: {
    expiresAt: string;
  };
}
