export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = 'message' in error ? error.message : null;
    const maybeDetails = 'details' in error ? error.details : null;
    const maybeHint = 'hint' in error ? error.hint : null;
    const maybeCode = 'code' in error ? error.code : null;

    const parts = [maybeMessage, maybeDetails, maybeHint, maybeCode]
      .filter((part) => typeof part === 'string' && part.trim().length > 0) as string[];

    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }

  return 'Unknown error';
}
