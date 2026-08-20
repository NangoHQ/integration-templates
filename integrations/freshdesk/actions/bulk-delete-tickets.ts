import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_ids: z.array(z.number()).describe('Array of ticket IDs to delete. Example: [1, 2, 3]')
    })
    .describe('Input for deleting multiple Freshdesk tickets in a single bulk request.');

const OutputSchema = z
    .object({
        job_id: z.string().describe('Unique identifier of the async deletion job.'),
        href: z.string().describe('URL to poll the job status.')
    })
    .describe('Async job reference returned by the Freshdesk bulk ticket deletion endpoint.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes multiple Freshdesk tickets asynchronously via a bulk job.
 * @pitfalls: Deletion is asynchronous and the action returns only a job reference; the caller must poll the job status to confirm completion.
 */
const action = createAction({
    description: 'Delete multiple Freshdesk tickets in a single call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#bulk_delete_tickets
            endpoint: '/api/v2/tickets/bulk_delete',
            data: {
                bulk_action: {
                    ids: input.ticket_ids
                }
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        const ProviderResponseSchema = z.object({
            job_id: z.string(),
            href: z.string()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            job_id: providerResponse.job_id,
            href: providerResponse.href
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
