import { randomUUID } from 'node:crypto';
import type { Instrumentation } from 'next';
import { recordAuditEvent } from '@/lib/db/audit-events';
import { logger } from '@/lib/logging/logger';

export const handleRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const requestIdHeader = request.headers['x-request-id'];
  const correlationId =
    (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader)?.slice(0, 128) || randomUUID();
  logger.error(
    { event: 'application.request_error', requestId: correlationId },
    { error, method: request.method, path: request.path, routeType: context.routerKind },
  );
  await recordAuditEvent({
    eventType: 'application.error',
    severity: 'error',
    outcome: 'failed',
    summary: 'Unerwarteter Anwendungsfehler.',
    correlationId,
    metadata: { method: request.method, path: request.path, routeType: context.routerKind },
  });
};
