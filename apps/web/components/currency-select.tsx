'use client';

import { Check, ChevronDown } from 'lucide-react';

import { CURRENCY_OPTIONS } from '@repo/constant';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/tooltip';

import { useCurrency } from './currency-provider';

export function CurrencySelect() {
  const { currency, setCurrency, isLoading } = useCurrency();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 px-2 font-medium tabular-nums"
              aria-label={`Currency: ${currency.name}`}
              disabled={isLoading}
            >
              <span>{currency.symbol}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Display currency</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuLabel>Currency</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CURRENCY_OPTIONS.map((option) => {
          const isSelected =
            option.name === currency.name && option.symbol === currency.symbol;

          return (
            <DropdownMenuItem
              key={`${option.name}-${option.symbol}`}
              className="flex cursor-pointer items-center justify-between gap-2"
              onClick={() => setCurrency(option)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-8 shrink-0 text-right font-medium tabular-nums">
                  {option.symbol}
                </span>
                <span className="truncate">{option.name}</span>
              </span>
              {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
