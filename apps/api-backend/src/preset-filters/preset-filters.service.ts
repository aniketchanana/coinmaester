import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TRANSACTION_FILTER_TYPE,
  type TransactionFilterType,
} from '@repo/constant';
import { Prisma } from '@repo/database';

import { PrismaService } from '../database/prisma.service';
import type {
  CreatePresetFilterBody,
  PresetFilterDateRange,
  PresetFilterDto,
  UpdatePresetFilterBody,
} from './preset-filters.types';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_DATE_RANGE_KEYS = new Set(['startDate', 'endDate']);

@Injectable()
export class PresetFiltersService {
  constructor(private readonly prisma: PrismaService) {}

  async listPresetFilters(userId: string): Promise<PresetFilterDto[]> {
    const rows = await this.prisma.client.presetFilter.findMany({
      where: { userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toDto(row));
  }

  async createPresetFilter(
    userId: string,
    body: CreatePresetFilterBody,
  ): Promise<PresetFilterDto> {
    const name = this.parseRequiredName(body.name);
    const payee = this.parseOptionalPayee(body.payee);
    const type = this.parseOptionalType(body.type);
    const dateRange = this.parseOptionalDateRange(body.dateRange);

    this.assertHasFilterFacet({ payee, type, dateRange });

    const row = await this.prisma.client.presetFilter.create({
      data: {
        userId,
        name,
        payee,
        type,
        dateRange:
          dateRange === null
            ? Prisma.JsonNull
            : (dateRange as Prisma.InputJsonValue),
      },
    });

    return this.toDto(row);
  }

  async updatePresetFilter(
    userId: string,
    id: string,
    body: UpdatePresetFilterBody,
  ): Promise<PresetFilterDto> {
    const existing = await this.findActivePresetFilter(userId, id);

    const name =
      body.name !== undefined
        ? this.parseRequiredName(body.name)
        : existing.name;
    const payee =
      body.payee !== undefined
        ? this.parseOptionalPayee(body.payee)
        : existing.payee;
    const type =
      body.type !== undefined
        ? this.parseOptionalType(body.type)
        : existing.type;
    const dateRange =
      body.dateRange !== undefined
        ? this.parseOptionalDateRange(body.dateRange)
        : this.normalizeStoredDateRange(existing.dateRange);

    this.assertHasFilterFacet({ payee, type, dateRange });

    const row = await this.prisma.client.presetFilter.update({
      where: { id },
      data: {
        name,
        payee,
        type,
        dateRange:
          dateRange === null
            ? Prisma.JsonNull
            : (dateRange as Prisma.InputJsonValue),
      },
    });

    return this.toDto(row);
  }

  async deletePresetFilter(userId: string, id: string): Promise<void> {
    await this.findActivePresetFilter(userId, id);
    await this.prisma.client.presetFilter.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  private async findActivePresetFilter(userId: string, id: string) {
    const existing = await this.prisma.client.presetFilter.findFirst({
      where: { id, userId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException('Preset filter not found');
    }

    return existing;
  }

  private parseRequiredName(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException('name is required');
    }

    return value.trim();
  }

  private parseOptionalPayee(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('payee must be a string');
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private parseOptionalType(value: unknown): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('type must be a string');
    }

    const normalized = value.trim().toUpperCase();

    if (
      normalized === TRANSACTION_FILTER_TYPE.DEBIT ||
      normalized === TRANSACTION_FILTER_TYPE.CREDIT ||
      normalized === TRANSACTION_FILTER_TYPE.INVESTMENT
    ) {
      return normalized as TransactionFilterType;
    }

    throw new BadRequestException(
      'type must be DEBIT, CREDIT, or INVESTMENT',
    );
  }

  private parseOptionalDateRange(
    value: unknown,
  ): PresetFilterDateRange | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(
        'dateRange must be an object with startDate and/or endDate',
      );
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);

    for (const key of keys) {
      if (!ALLOWED_DATE_RANGE_KEYS.has(key)) {
        throw new BadRequestException(
          'dateRange may only include startDate and endDate',
        );
      }
    }

    const startDate = this.parseOptionalDateField(
      record.startDate,
      'startDate',
    );
    const endDate = this.parseOptionalDateField(record.endDate, 'endDate');

    if (!startDate && !endDate) {
      return null;
    }

    const result: PresetFilterDateRange = {};
    if (startDate) {
      result.startDate = startDate;
    }
    if (endDate) {
      result.endDate = endDate;
    }

    return result;
  }

  private parseOptionalDateField(
    value: unknown,
    fieldName: string,
  ): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
      throw new BadRequestException(
        `${fieldName} must be a yyyy-MM-dd string`,
      );
    }

    return value;
  }

  private assertHasFilterFacet(input: {
    payee: string | null;
    type: string | null;
    dateRange: PresetFilterDateRange | null;
  }): void {
    const hasDate =
      Boolean(input.dateRange?.startDate) || Boolean(input.dateRange?.endDate);

    if (!input.payee && !input.type && !hasDate) {
      throw new BadRequestException(
        'At least one filter value (payee, type, or date range) is required',
      );
    }
  }

  private normalizeStoredDateRange(
    value: Prisma.JsonValue | null,
  ): PresetFilterDateRange | null {
    return this.parseOptionalDateRange(value);
  }

  private toDto(row: {
    id: string;
    name: string;
    payee: string | null;
    dateRange: Prisma.JsonValue | null;
    type: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PresetFilterDto {
    return {
      id: row.id,
      name: row.name,
      payee: row.payee,
      dateRange: this.normalizeStoredDateRange(row.dateRange),
      type: row.type,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
