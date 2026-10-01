import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z
            .string()
            .describe(
                'Email address to verify for deliverability. Sent to lemlist as a query parameter, not in a request body. Example: "jane.doe@example.com".'
            )
    })
    .describe('Input for starting an asynchronous email-address verification.');

const ProviderEnrichmentJobSchema = z.object({
    id: z.string()
});

const ProviderErrorBodySchema = z.object({
    error: z.string(),
    message: z.string().optional()
});

const ProxyErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown()
    })
});

const OutputSchema = z
    .object({
        id: z
            .string()
            .optional()
            .describe(
                'ID of the asynchronous verification job, used to fetch the result once it completes. Example: "enr_CzQDYYcS5vDG1ZvQi". Present only when started is true.'
            ),
        started: z.boolean().describe('Whether lemlist accepted the request and queued the asynchronous verification job.'),
        error: z
            .string()
            .optional()
            .describe('Provider error code when the job could not be started, e.g. "linkedin-not-linked". Present only when started is false.'),
        message: z.string().optional().describe('Human-readable provider error message when the job could not be started. Present only when started is false.')
    })
    .describe(
        'Outcome of requesting an asynchronous email-address verification. The verification result itself is retrieved separately with the returned job ID.'
    );

function toNotStartedResult(status: number, data: unknown): { started: false; error: string; message?: string } | undefined {
    if (status !== 403) {
        return undefined;
    }

    const errorBody = ProviderErrorBodySchema.safeParse(data);

    if (errorBody.success && errorBody.data.error === 'linkedin-not-linked') {
        return {
            started: false,
            error: errorBody.data.error,
            ...(errorBody.data.message !== undefined && { message: errorBody.data.message })
        };
    }

    return undefined;
}

/**
 * @tags: [write]
 * @tagReason: Starts a new billable verification job via POST, which mutates provider state (a queued enrichment job and consumed credits); it reads nothing and deletes nothing.
 * @pitfalls: Verification is asynchronous: a started job returns only a job ID, and the deliverability result must be fetched separately once it completes (polled or delivered via webhook). lemlist requires a LinkedIn account linked to the team even for pure email verification; without one the request is rejected and the action returns started=false with error "linkedin-not-linked". Each verification consumes team enrichment credits.
 */
const action = createAction({
    description: 'Kick off asynchronous email-address verification (deliverability check) for a given email.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/enrich/enrich-data
            endpoint: '/api/enrich',
            params: {
                verifyEmail: 'true',
                email: input.email
            },
            // No idempotency key: every call queues a new billable verification job, so a retry after a lost response would silently start a duplicate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        // @allowTryCatch: lemlist reports a known, non-retryable account-prerequisite failure (no LinkedIn account linked to the team) as an HTTP 403, which the
        // proxy may surface either as a thrown error or as a returned error response; normalize both into a structured not-started result.
        try {
            const response = await nango.post(config);

            const notStarted = toNotStartedResult(response.status, response.data);

            if (notStarted) {
                return notStarted;
            }

            const job = ProviderEnrichmentJobSchema.parse(response.data);

            return {
                id: job.id,
                started: true
            };
        } catch (err: unknown) {
            const proxyError = ProxyErrorSchema.safeParse(err);

            if (proxyError.success) {
                const notStarted = toNotStartedResult(proxyError.data.response.status, proxyError.data.response.data);

                if (notStarted) {
                    return notStarted;
                }
            }

            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
