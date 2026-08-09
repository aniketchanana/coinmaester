import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HttpException, Injectable } from '@nestjs/common';
import {
  TRANSACTION_CURRENCY,
  TRANSACTION_FILTER_TYPE,
  TRANSACTION_NOTES_MAX_LENGTH,
  TRANSACTION_TYPE,
} from '@repo/constant';
import { z } from 'zod';
import {
  TRANSACTION_SORT_FIELD,
  TRANSACTION_SORT_ORDER,
  TransactionsService,
} from '../transactions/transactions.service';

@Injectable()
export class McpService {
  constructor(private readonly transactionsService: TransactionsService) {}

  createServer(userId: string): McpServer {
    const server = new McpServer({
      name: 'coinmaester-mcp',
      version: '0.0.1',
    });

    server.registerTool(
      'ping',
      {
        title: 'Ping',
        description:
          'Health check. Returns pong and echoes the authenticated user id',
      },
      () => {
        return {
          content: [
            { type: 'text', text: `pong (authenticated user: ${userId})` },
          ],
        };
      },
    );

    server.registerTool(
      'get_financial_transaction_list',
      {
        title: 'Get List of Financial Transactions for User',
        description:
          'Retrieve a list of financial transactions recorded for the currently authenticated user. ' +
          'Each transaction includes details such as the transaction type (DEBIT/CREDIT), amount, merchant name, bank name, date, notes, investment status, and currency. ' +
          "Use this endpoint to display a user's transaction history or to provide insights into their spending, income patterns or any other query user ask",
        inputSchema: {
          limit: z
            .number()
            .int()
            .positive()
            .max(1000)
            .describe(
              'Maximum number of transactions to return per page (page size). Must be between 1 and 1000.',
            ),
          page: z
            .number()
            .int()
            .positive()
            .describe(
              'Page number for pagination, starting at 1. Combined with "limit" to page through results (e.g. page 2 with limit 50 returns transactions 51-100).',
            ),
          startDate: z
            .string()
            .optional()
            .describe(
              'ISO 8601 date string: Only transactions occurring after this date (inclusive)',
            ),
          endDate: z
            .string()
            .optional()
            .describe(
              'ISO 8601 date string: Only transactions occurring before this date (inclusive)',
            ),
          payee: z
            .string()
            .optional()
            .describe(
              'Filter by merchant name, whom user has paid money or received money.',
            ),
          type: z
            .enum([
              TRANSACTION_FILTER_TYPE.DEBIT,
              TRANSACTION_FILTER_TYPE.CREDIT,
              TRANSACTION_FILTER_TYPE.INVESTMENT,
            ])
            .optional()
            .describe('Filter by transaction type (DEBIT/CREDIT/INVESTMENT)'),
          sortBy: z
            .enum([
              TRANSACTION_SORT_FIELD.TRANSACTION_DATE,
              TRANSACTION_SORT_FIELD.TRANSACTION_VALUE,
            ])
            .optional()
            .describe(
              'Field to sort by: "transactionDate" (when it happened) or "transactionValue" (amount). Defaults to transactionDate.',
            ),
          sortOrder: z
            .enum([TRANSACTION_SORT_ORDER.ASC, TRANSACTION_SORT_ORDER.DESC])
            .optional()
            .describe(
              'Sort direction: "asc" (oldest/smallest first) or "desc" (newest/largest first). Defaults to desc.',
            ),
        },
      },
      async (args) => {
        try {
          const transactions = await this.transactionsService.listTransactions(
            userId,
            args,
          );
          return {
            content: [
              {
                type: 'text',
                text:
                  `Found ${transactions.pagination.total} transaction(s) ` +
                  `(page ${transactions.pagination.page} of ${transactions.pagination.totalPages}). ` +
                  `Totals — debit: ${transactions.aggregate.totalDebit}, ` +
                  `credit: ${transactions.aggregate.totalCredit}, ` +
                  `investment: ${transactions.aggregate.totalInvestment}.` +
                  `Currency symbol: ${transactions.currencyType.symbol}.` +
                  `Currency name: ${transactions.currencyType.name}.`,
              },
            ],
            structuredContent: {
              data: transactions.data,
              pagination: transactions.pagination,
              aggregate: transactions.aggregate,
              currencyType: transactions.currencyType,
            },
          };
        } catch (error) {
          const message =
            error instanceof HttpException
              ? error.message
              : 'Unexpected error while fetching transactions';

          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Failed to fetch transactions: ${message}`,
              },
            ],
          };
        }
      },
    );

    server.registerTool(
      'post_financial_transaction',
      {
        title: 'Post Financial Transaction',
        description:
          "Record a financial transaction in the authenticated user's Coinmaester account. " +
          'Use DEBIT when money left the account and CREDIT when money was received.',
        inputSchema: {
          amount: z
            .number()
            .positive()
            .describe('Transaction amount in INR. Must be greater than 0.'),
          type: z
            .enum([TRANSACTION_TYPE.DEBIT, TRANSACTION_TYPE.CREDIT])
            .describe('DEBIT if money left the account, CREDIT if received.'),
          merchant: z
            .string()
            .min(1)
            .describe('Who the payment was made to or received from.'),
          bankName: z
            .string()
            .min(1)
            .describe('Bank or account this transaction belongs to.'),
          transactionDate: z
            .string()
            .refine((value) => !Number.isNaN(Date.parse(value)), {
              message: 'Must be an ISO 8601 date-time string.',
            })
            .describe(
              'When the transaction occurred, ISO 8601 (e.g. 2025-08-09T14:30:00Z).',
            ),
          notes: z
            .string()
            .max(TRANSACTION_NOTES_MAX_LENGTH)
            .optional()
            .describe('Optional free-text note (max 1000 chars).'),
          isInvestment: z
            .boolean()
            .optional()
            .describe('True if this transaction is an investment.'),
          currency: z
            .literal(TRANSACTION_CURRENCY)
            .optional()
            .describe('Currency code. Only INR is supported.'),
        },
      },
      async (args) => {
        try {
          const created = await this.transactionsService.createTransaction(
            userId,
            {
              bankName: args.bankName,
              transactionValue: args.amount,
              type: args.type,
              transactionDate: args.transactionDate,
              paymentMadeTo: args.merchant,
              notes: args.notes,
              isInvestment: args.isInvestment ?? false,
            },
          );
          return {
            content: [
              {
                type: 'text',
                text:
                  `Recorded ${created.type} of ${created.transactionValue} ` +
                  `to "${created.paymentMadeTo}" (${created.bankName}) ` +
                  `on ${created.transactionDate}. Transaction id: ${created.id}.`,
              },
            ],
            structuredContent: { transaction: created },
          };
        } catch (error) {
          const message =
            error instanceof HttpException
              ? error.message
              : 'Unexpected error while creating the transaction';

          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Failed to create transaction: ${message}`,
              },
            ],
          };
        }
      },
    );

    return server;
  }
}
