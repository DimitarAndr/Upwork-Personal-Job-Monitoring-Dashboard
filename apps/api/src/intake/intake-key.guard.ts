import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";

export const INTAKE_KEY_HEADER = "x-intake-key";

@Injectable()
export class IntakeKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expectedKey = process.env.INTAKE_WEBHOOK_KEY?.trim();

    // Keep local development friction low when the shared secret is not configured yet.
    if (!expectedKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const headerValue = request.headers[INTAKE_KEY_HEADER];
    const providedKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (providedKey !== expectedKey) {
      throw new UnauthorizedException(
        `Missing or invalid ${INTAKE_KEY_HEADER} header.`
      );
    }

    return true;
  }
}
