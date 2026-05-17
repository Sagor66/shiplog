/**
 * Shared auth types used across @shiplog/auth, the API guard, and the web
 * client. Kept separate from the Better Auth instance so callers that only
 * need the shape (eg. NestJS request typings) don't pull in the full server.
 */

export interface AuthEmailService {
  /**
   * Deliver an email-verification link to the given recipient.
   *
   * Implementations decide the transport — the dev impl logs via Pino so the
   * link is visible in the terminal; a production impl would call Resend.
   */
  sendVerificationEmail(input: {
    to: string;
    name: string | null;
    url: string;
    token: string;
    expiresInSeconds: number;
  }): Promise<void>;

  /**
   * Deliver a password-reset link to the given recipient.
   */
  sendPasswordResetEmail(input: {
    to: string;
    name: string | null;
    url: string;
    token: string;
    expiresInSeconds: number;
  }): Promise<void>;
}

export interface AuthLogger {
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
}

export interface CreateAuthConfig {
  /**
   * The base URL Better Auth uses for cookies, OAuth redirects, and Origin
   * verification. Must match the public origin the browser sees. In dev:
   * `http://localhost:3000`. In prod: the canonical web app URL.
   */
  baseURL: string;

  /**
   * Long-lived random secret used to sign cookies and OAuth state tokens.
   * Generate with `openssl rand -base64 32`. NEVER commit this value.
   */
  secret: string;

  /**
   * `true` in production. Forces Secure cookies and disables in-memory rate
   * limiting fallbacks. Defaults to `process.env.NODE_ENV === 'production'`.
   */
  isProduction?: boolean;

  /**
   * Outbound email transport. The dev factory wires a Pino logger here.
   */
  emailService: AuthEmailService;

  /**
   * Structured logger. Used for emitting auth telemetry events
   * (rate-limit breaches, OAuth failures) that should land in your normal
   * application log stream.
   */
  logger: AuthLogger;

  /**
   * GitHub OAuth credentials. If either is missing, the GitHub provider is
   * not registered (the email/password flow still works).
   */
  github?: {
    clientId: string;
    clientSecret: string;
  };
}
