import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const apiKey = request.headers['x-internal-api-key'];
    const expected = this.config.get<string>('INTERNAL_API_KEY');

    if (!expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
