import type { Instrumentation } from 'next';

export async function register() {}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { handleRequestError } = await import('./instrumentation-node');
  await handleRequestError(error, request, context);
};
