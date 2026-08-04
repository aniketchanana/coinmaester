/** Whether Gmail sync + RabbitMQ AI parsing pipeline is enabled. Defaults to true. */
export function isAiParsingEnabled(): boolean {
  const raw = process.env.AI_PARSING_ENABLED?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}
