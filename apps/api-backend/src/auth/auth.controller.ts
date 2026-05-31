import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import type { GoogleAuthPayload } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type GoogleAuthRequest = Request & { user: GoogleAuthPayload };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

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
    const { accessToken } = await this.authService.loginWithGoogle(request.user);

    response.redirect(`${webUrl}/auth/callback?token=${encodeURIComponent(accessToken)}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { sub: string }) {
    return this.authService.getUserById(user.sub);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', { path: '/' });
    return { ok: true };
  }
}
