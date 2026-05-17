import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a request carries a valid session whose user has not yet
 * verified their email. We surface this case explicitly (unlike a generic
 * 401) because the client UI needs to prompt the user to check their
 * inbox — hiding it would just trap them in a redirect loop.
 */
export class EmailNotVerifiedError extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'EmailNotVerified',
        message: 'Email verification required.',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
