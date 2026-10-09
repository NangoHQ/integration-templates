import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID that owns the estimate. Example: "927270289"'),
        estimate_id: z.string().describe('ID of the estimate to mark as accepted. Example: "260815000000170020"')
    })
    .describe('Input for marking a Zoho Invoice estimate as accepted.');

const ProviderStatusResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const ProviderEstimateSchema = z.object({
    estimate: z.object({
        estimate_id: z.string(),
        estimate_number: z.string().optional(),
        status: z.string()
    })
});

const OutputSchema = z
    .object({
        estimate_id: z.string().describe('ID of the estimate that was marked as accepted.'),
        estimate_number: z.string().optional().describe('Human-readable estimate number. Example: "QT-000011"'),
        status: z.string().describe('Confirmed status of the estimate after the transition; "accepted" on success.')
    })
    .describe('Confirmed result of marking a Zoho Invoice estimate as accepted.');

/**
 * @tags: [read, write]
 * @tagReason: Marks the estimate accepted through the provider's status endpoint, then reads the estimate back to confirm the new status.
 * @pitfalls: An estimate must already be in sent status before it can be accepted, so accepting a draft fails; accepting an already-accepted estimate returns an error rather than succeeding idempotently.
 */
const action = createAction({
    description: 'Mark an estimate as accepted.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.estimates.CREATE', 'ZohoInvoice.estimates.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const estimateId = encodeURIComponent(input.estimate_id);

        // https://www.zoho.com/invoice/api/v3/estimates/#mark-an-estimate-as-accepted
        const statusResponse = await nango.post({
            endpoint: `/invoice/v3/estimates/${estimateId}/status/accepted`,
            params: {
                organization_id: input.organization_id
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Zoho rejects accepting an already-accepted estimate, so a replay after a lost response would report a completed transition as a failure.
            retries: 0
        });

        const status = ProviderStatusResponseSchema.parse(statusResponse.data);

        if (status.code !== 0) {
            throw new nango.ActionError({
                type: 'estimate_status_transition_failed',
                message: status.message,
                code: status.code,
                estimate_id: input.estimate_id
            });
        }

        // https://www.zoho.com/invoice/api/v3/estimates/#get-an-estimate
        const estimateResponse = await nango.get({
            endpoint: `/invoice/v3/estimates/${estimateId}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const estimate = ProviderEstimateSchema.parse(estimateResponse.data).estimate;

        return {
            estimate_id: estimate.estimate_id,
            ...(estimate.estimate_number != null && { estimate_number: estimate.estimate_number }),
            status: estimate.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
