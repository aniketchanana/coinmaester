import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';

import { clearAccessTokenCookie, setAccessTokenCookie } from './auth-cookie';
import { AuthService } from './auth.service';
import { OAUTH_RETURN_TO_COOKIE, type GoogleAuthPayload } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type GoogleAuthRequest = Request & { user: GoogleAuthPayload };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Passport redirects to Google.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() request: GoogleAuthRequest,
    @Res() response: Response,
  ) {
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    const { accessToken } = await this.authService.loginWithGoogle(
      request.user,
    );

    // Set the JWT as an httpOnly cookie here instead of passing it through
    // the redirect URL, where it would leak into logs and browser history.
    setAccessTokenCookie(response, accessToken);

    // If this login was triggered mid-OAuth (Gemini/MCP), resume the
    // /authorize flow instead of dropping the user on the dashboard.
    const returnTo = this.resolveOAuthReturnTo(request);
    if (returnTo) {
      response.clearCookie(OAUTH_RETURN_TO_COOKIE);
      response.redirect(returnTo);
      return;
    }

    response.redirect(`${webUrl}/transactions`);
  }

  private resolveOAuthReturnTo(request: Request): string | null {
    const raw = request.cookies?.[OAUTH_RETURN_TO_COOKIE] as string | undefined;
    if (!raw) {
      return null;
    }

    const issuerOrigin = new URL(
      process.env.OAUTH_ISSUER_URL ?? 'http://localhost:3001',
    ).origin;

    try {
      const parsed = new URL(raw);
      // Only ever redirect back to our own /authorize endpoint. This closes
      // the open-redirect hole where an attacker could plant an arbitrary
      // returnTo URL and bounce the freshly-authenticated user off-site.
      if (parsed.origin === issuerOrigin && parsed.pathname === '/authorize') {
        return parsed.href;
      }
    } catch {
      // Malformed cookie value — ignore and fall through to default.
    }

    return null;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { sub: string }) {
    return this.authService.getUserById(user.sub);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    clearAccessTokenCookie(response);
    return { ok: true };
  }
}
