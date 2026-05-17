/**
 * DI token for the configured Better Auth instance. We expose the instance
 * as a provider rather than constructing it in `AuthService` directly so
 * that future plugins (audit logging, custom session fields) only need to
 * touch the module wiring.
 */
export const AUTH_INSTANCE = Symbol('AUTH_INSTANCE');
