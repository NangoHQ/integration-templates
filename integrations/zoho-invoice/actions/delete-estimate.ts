import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z.string().describe('ID of the Zoho Invoice organization that owns the estimate. Example: "123456789"'),
        estimate_id: z.string().describe('ID of the estimate to delete. Example: "123456789012345678"')
    })
    .describe('Identifiers for the estimate to delete and its Zoho Invoice organization.');

const DeleteEstimateResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Zoho Invoice confirms the estimate was deleted.'),
        message: z.string().describe('Confirmation message returned by Zoho Invoice.')
    })
    .describe('Confirmation that the estimate was deleted from Zoho Invoice.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing estimate from the provider, permanently removing it.
 * @pitfalls: Deleting an estimate is permanent and cannot be undone, and deleting one that does not exist fails with a 404 "Quote does not exist"; this connection cannot look up organization_id, so the caller must supply a valid one.
 */
const action = createAction({
    description: 'Delete an estimate.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.estimates.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.zoho.com/invoice/api/v3/estimates/#delete-an-estimate
            endpoint: `/invoice/v3/estimates/${encodeURIComponent(input.estimate_id)}`,
            params: {
                organization_id: input.organization_id
            },
            // Deletion is irreversible and a retry after a lost response would 404 on an already-deleted estimate, so do not retry.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = DeleteEstimateResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: parsed.message,
                code: parsed.code
            });
        }

        return {
            success: true,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
