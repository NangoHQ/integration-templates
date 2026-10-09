import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        estimate_id: z.string().describe('The unique ID of the estimate to mark as declined. Example: "260815000000167043"'),
        organization_id: z.string().describe('Zoho Invoice organization ID that owns the estimate. Example: "927270289"')
    })
    .describe('Identifies the estimate to decline and the Zoho Invoice organization it belongs to.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Provider status code. 0 means the estimate was successfully marked as declined.'),
        message: z.string().describe('Human-readable provider confirmation message.')
    })
    .describe('Result of the status transition reported by Zoho Invoice.');

/**
 * @tags: [write]
 * @tagReason: Transitions the estimate to the declined status through a provider mutation without deleting or clearing any record.
 * @pitfalls: The estimate must not be a draft and must not already be declined; Zoho rejects declining a draft estimate or re-declining an already-declined one with a provider error instead of succeeding silently.
 */
const action = createAction({
    description: 'Mark an estimate as declined.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.estimates.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/invoice/api/v3/estimates/#mark-an-estimate-as-declined
            endpoint: `/invoice/v3/estimates/${encodeURIComponent(input.estimate_id)}/status/declined`,
            params: {
                organization_id: input.organization_id
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Zoho rejects re-declining an estimate, so a replay after a lost response would report a completed transition as a failure.
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            code: parsed.code,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
