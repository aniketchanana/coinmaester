'use client';

import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@repo/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/tooltip';

import { useIncognito } from './incognito-provider';

export function IncognitoToggle() {
  const { isIncognito, toggleIncognito } = useIncognito();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            isIncognito ? 'Show sensitive details' : 'Hide sensitive details'
          }
          aria-pressed={isIncognito}
          onClick={toggleIncognito}
        >
          {isIncognito ? (
            <Eye className="h-5 w-5" />
          ) : (
            <EyeOff className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isIncognito ? 'Show sensitive details' : 'Hide sensitive details'}
      </TooltipContent>
    </Tooltip>
  );
}
