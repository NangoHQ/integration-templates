import { z } from 'zod';
import { createTool } from 'nango';

const IdentitySchema = z
    .object({
        type: z.enum(['userId', 'amplitudeId']).describe('Identity namespace for the requested user.'),
        value: z.string().min(1).describe('Opaque user ID or decimal integer string for an Amplitude ID.')
    })
    .describe('One identity whose behavioral data should be exported.')
    // Declares the approved conditional validation in the compiled JSON Schema; the .refine() below enforces it at runtime.
    .meta({
        allOf: [{ if: { properties: { type: { const: 'amplitudeId' } } }, then: { properties: { value: { pattern: '^[0-9]+$' } } } }]
    })
    .refine((identity) => identity.type !== 'amplitudeId' || /^[0-9]+$/.test(identity.value), {
        message: 'An amplitudeId identity value must be a decimal integer string.'
    });

const InputSchema = z
    .object({
        identity: IdentitySchema,
        startDate: z.iso.date().describe('Inclusive event_time lower boundary at 00:00:00 UTC on this calendar date.'),
        endDate: z.iso.date().describe('Inclusive event_time upper boundary at 00:00:00 UTC on this date, not the whole day. Must be on or after startDate.')
    })
    .describe("Request parameters for exporting one user's Amplitude behavioral data over a date range.");

const OutputSchema = z
    .object({
        id: z.string().describe('Opaque DSAR request identifier, represented as a string even though upstream returns an integer.')
    })
    .describe('The accepted asynchronous DSAR export job.');

const DsarResponseSchema = z.object({
    requestId: z.number().int()
});

const HttpErrorSchema = z.object({
    response: z.looseObject({ status: z.number() })
});

function throwForFailureStatus(status: number): never {
    if (status === 400) {
        throw new Error('invalid_request: The provider rejected the user identity or request. Correct the identity and requested range.');
    }
    if (status === 401 || status === 403) {
        throw new Error(
            'permission_denied: Organization-level DSAR access is denied. Ask an administrator for the org-level API key and secret required by DSAR.'
        );
    }
    if (status === 429) {
        throw new Error(
            'rate_limited: The shared DSAR 14,400 cost/hour budget is exceeded. Reduce polling and submission frequency and retry after the budget permits; POST costs 8 and GET costs 1.'
        );
    }
    throw new Error(
        `write_result_unknown: The submission failed with status ${status} and may have created a job whose ID cannot be established. Check DSAR activity before replaying; another submission may create duplicate jobs and consume quota.`
    );
}

/**
 * @tags: [write]
 * @tagReason: Submits a new asynchronous DSAR export job to Amplitude; it reads no provider data and creates a server-side job.
 * @pitfalls: The export is not ready when this returns: jobs can take up to three days, and results expire two days after completion. Resubmitting the same user creates a duplicate job with no deduplication and consumes the shared DSAR rate-limit budget. Users with more than 100,000 events per month are unsupported.
 */
const tool = createTool({
    name: 'create-data-subject-access-request',
    description: "Request an asynchronous export of one user's Amplitude behavioral data over a date range.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Requires an org-level API key and secret. This submits only; jobs can take three days. Use `get-data-subject-access-request` to check status, then `download-data-subject-access-output` for each output. Dates bound event_time at midnight UTC inclusively; endDate is not the end of that calendar day. Statsig and AI Feedback support-source data are excluded.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        if (input.endDate < input.startDate) {
            throw new Error('invalid_date_range: endDate precedes startDate. Use an end date on or after the start date.');
        }

        // The amplitudeId value is embedded as a raw JSON integer so decimal strings above Number.MAX_SAFE_INTEGER serialize without
        // precision loss; the input schema restricts it to digits only, so the constructed JSON stays valid.
        const identityField = input.identity.type === 'userId' ? `"userId":${JSON.stringify(input.identity.value)}` : `"amplitudeId":${input.identity.value}`;
        const body = `{${identityField},"startDate":${JSON.stringify(input.startDate)},"endDate":${JSON.stringify(input.endDate)}}`;

        let response: { status: number; data: unknown };
        // @allowTryCatch: The tool must translate documented provider failures (400/401/403/429) and unknown submission outcomes into its public error codes.
        try {
            // https://amplitude.com/docs/apis/analytics/ccpa-dsar
            response = await nango.post({
                endpoint: '/api/2/dsar/requests',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                data: body,
                // retries: 0 because submission is not idempotent: replaying after a lost response would create a duplicate DSAR job and consume quota.
                retries: 0
            });
        } catch (err) {
            const httpError = HttpErrorSchema.safeParse(err);
            if (httpError.success) {
                throwForFailureStatus(httpError.data.response.status);
            }
            throw new Error(
                'write_result_unknown: The submission may have created a job but its ID cannot be established. Check DSAR activity before replaying; another submission may create duplicate jobs and consume quota.'
            );
        }

        if (response.status < 200 || response.status >= 300) {
            throwForFailureStatus(response.status);
        }

        const parsed = DsarResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(
                'write_result_unknown: The submission was accepted but its request ID could not be established. Check DSAR activity before replaying; another submission may create duplicate jobs and consume quota.'
            );
        }

        return { id: String(parsed.data.requestId) };
    }
});

export default tool;
