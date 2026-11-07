import * as Sentry from '@sentry/nextjs'
import { SeverityNumber } from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
const missingPostHogVariable = !posthogProjectToken
  ? 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN'
  : !posthogHost
    ? 'NEXT_PUBLIC_POSTHOG_HOST'
    : undefined

// This provider is intentionally dedicated to the logs added below; existing application
// and framework loggers keep their current outputs and are not exported to PostHog.
export const loggerProvider =
  posthogProjectToken && posthogHost
    ? new LoggerProvider({
        resource: resourceFromAttributes({ 'service.name': 'labsfood-admin-dashboard' }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${posthogHost}/i/v1/logs`,
              headers: {
                Authorization: `Bearer ${posthogProjectToken}`,
                'Content-Type': 'application/json',
              },
            }),
          }),
        ],
      })
    : undefined

// Always obtain this dedicated logger from the provider, not the global API.
export const posthogLogger = loggerProvider?.getLogger('labsfood-admin-dashboard.posthog')

/**
 * Exécuté une fois au démarrage du serveur Next. Les racines eMudhra (emSign) ne sont
 * plus de confiance (compromission de l'AC eMudhra, 31/10/2026) : toutes les
 * connexions TLS du serveur (relais /lf-api, Clerk, Sentry) les
 * refusent. Aucun hôte appelé par l'app n'en dépendait à cette date.
 *
 * Sentry démarre ensuite. Sans NEXT_PUBLIC_SENTRY_DSN, il reste éteint.
 */
export async function register() {
  // Bloc `if` (pas de retour anticipé) : le bundle Edge l'élimine sans charger node:tls.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (loggerProvider) {
      posthogLogger?.emit({
        body: 'Admin dashboard server instrumentation initialized',
        severityNumber: SeverityNumber.INFO,
        attributes: { component: 'instrumentation', runtime: 'nodejs' },
      })
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `${missingPostHogVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingPostHogVariable} is configured`,
      )
    }

    const { rootCertificates, setDefaultCACertificates } = await import('node:tls')
    const { X509Certificate } = await import('node:crypto')
    setDefaultCACertificates(
      rootCertificates.filter((pem) => !/eMudhra|emSign/i.test(new X509Certificate(pem).subject)),
    )
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
    tracesSampleRate: 0.1,
  })
}

/** Erreurs des Server Components, des route handlers et de proxy.ts. */
export const onRequestError = (...args: Parameters<typeof Sentry.captureRequestError>) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    posthogLogger?.emit({
      body: 'Server request error forwarded to Sentry',
      severityNumber: SeverityNumber.ERROR,
      attributes: { component: 'request_error_handler' },
    })
  }
  return Sentry.captureRequestError(...args)
}
