import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DEFAULT_CURRENCY,
  isCurrencyType,
  type CurrencyType,
} from '@repo/constant';
import type { Prisma } from '@repo/database';

import { PrismaService } from '../database/prisma.service';
import type {
  PreferencesDto,
  UpdatePreferencesBody,
} from './preferences.types';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<PreferencesDto> {
    const currencyType = await this.getCurrencyType(userId);
    return { currencyType };
  }

  async getCurrencyType(userId: string): Promise<CurrencyType> {
    const row = await this.prisma.client.userPreference.findUnique({
      where: { userId },
      select: { currencyType: true },
    });

    if (!row) {
      return DEFAULT_CURRENCY;
    }

    if (isCurrencyType(row.currencyType)) {
      return row.currencyType;
    }

    return DEFAULT_CURRENCY;
  }

  async updatePreferences(
    userId: string,
    body: UpdatePreferencesBody,
  ): Promise<PreferencesDto> {
    const currencyType = this.parseCurrencyType(body.currencyType);

    await this.prisma.client.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        currencyType: currencyType as Prisma.InputJsonValue,
      },
      update: {
        currencyType: currencyType as Prisma.InputJsonValue,
      },
    });

    return { currencyType };
  }

  private parseCurrencyType(value: unknown): CurrencyType {
    if (!isCurrencyType(value)) {
      throw new BadRequestException(
        'currencyType must be a supported { name, symbol } pair',
      );
    }

    return value;
  }
}
