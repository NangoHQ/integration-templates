import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        estimate_id: z.string().describe('ID of the Zoho Invoice estimate to mark as sent. Example: "982000000567011"'),
        organization_id: z
            .string()
            .describe(
                'ID of the Zoho Invoice organization that owns the estimate. Zoho Invoice requires it on every request and it cannot be discovered with this connection scope.'
            )
    })
    .describe('Identifies the estimate to mark as sent and the organization that owns it.');

const ProviderStatusChangeSchema = z.object({
    code: z.number(),
    message: z.string()
});

const ProviderEstimateSchema = z.object({
    estimate_id: z.string(),
    status: z.string(),
    estimate_number: z.string().optional(),
    customer_name: z.string().optional()
});

const ProviderEstimateResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    estimate: ProviderEstimateSchema
});

const OutputSchema = z
    .object({
        estimate_id: z.string().describe('ID of the estimate that was marked as sent.'),
        status: z.string().describe('Estimate status read back from the provider after the transition, confirming the change. Example: "sent"'),
        estimate_number: z.string().optional().describe('Human-readable estimate number. Example: "EST-00002"'),
        customer_name: z.string().optional().describe('Name of the customer the estimate belongs to.'),
        message: z.string().describe('Provider confirmation message for the status change. Example: "Quote status has been changed to Sent."')
    })
    .describe('Confirmation that the estimate was marked as sent, including the provider-confirmed status.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the estimate back from the provider to confirm its new status after transitioning it to sent, which is a provider write.
 * @pitfalls: Marking an estimate as sent changes only its status and does not email it to the customer; sending the email requires a separate operation. A sent estimate cannot be changed back to Draft.
 */
const action = createAction({
    description: "Transition an estimate's status to Sent.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.estimates.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const statusResponse = await nango.post({
            // https://www.zoho.com/invoice/api/v3/estimates/#mark-an-estimate-as-sent
            endpoint: `/invoice/v3/estimates/${encodeURIComponent(input.estimate_id)}/status/sent`,
            params: {
                organization_id: input.organization_id
            },
            // Marking an estimate as sent sets the status to a fixed value, so retrying a lost response is safe.
            retries: 3
        });

        const statusChange = ProviderStatusChangeSchema.parse(statusResponse.data);

        if (statusChange.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: statusChange.message,
                code: statusChange.code
            });
        }

        const estimateResponse = await nango.get({
            // https://www.zoho.com/invoice/api/v3/estimates/#get-an-estimate
            endpoint: `/invoice/v3/estimates/${encodeURIComponent(input.estimate_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const estimateData = ProviderEstimateResponseSchema.parse(estimateResponse.data);

        return {
            estimate_id: estimateData.estimate.estimate_id,
            status: estimateData.estimate.status,
            ...(estimateData.estimate.estimate_number != null && { estimate_number: estimateData.estimate.estimate_number }),
            ...(estimateData.estimate.customer_name != null && { customer_name: estimateData.estimate.customer_name }),
            message: statusChange.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
