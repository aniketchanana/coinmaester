import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';

const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '7d';

function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET must be set to a strong value (>= 32 chars). Generate one with: openssl rand -base64 32',
    );
  }

  return secret;
}

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.register({
      secret: requireAuthSecret(),
      signOptions: {
        expiresIn: jwtExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
