/** Mirrors `AI_PARSING_ENABLED` via next.config → NEXT_PUBLIC_AI_PARSING_ENABLED. */
export const isAiParsingEnabled =
  process.env.NEXT_PUBLIC_AI_PARSING_ENABLED !== 'false' &&
  process.env.NEXT_PUBLIC_AI_PARSING_ENABLED !== '0';
