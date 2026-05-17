import { Controller, Get } from '@nestjs/common';

import { CurrentUser } from './decorators/current-user.decorator.js';
import type { MeResponseDto } from './dto/me-response.dto.js';
import type { AuthenticatedRequest, SessionUser } from './types.js';
import { Req } from '@nestjs/common';

/**
 * Auth-adjacent endpoints hosted on the resource API.
 *
 * The HTTP login/signup/verify endpoints are NOT here — they live on the
 * Next.js app at `/api/auth/[...all]` so the cookie issuer matches the
 * page origin. This controller only exposes "what does the current
 * cookie resolve to" — useful for client code that wants the user
 * record from the API tier (eg. to verify the cookie before a long-lived
 * websocket connection).
 */
@Controller('auth')
export class AuthController {
  /**
   * Return the user and session that the AuthGuard already validated for
   * this request. Hitting this route from a browser confirms the cookie
   * is good in both apps' eyes.
   */
  @Get('me')
  me(
    @CurrentUser() user: SessionUser,
    @Req() req: AuthenticatedRequest,
  ): MeResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      },
      session: {
        expiresAt: req.session.expiresAt.toISOString(),
      },
    };
  }
}
