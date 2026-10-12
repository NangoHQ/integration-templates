import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID. Required by every Zoho Invoice endpoint. Example: "927270289".'),
        contact_id: z.string().describe('ID of the contact to delete. Example: "260815000000097001".')
    })
    .describe('Input for deleting a Zoho Invoice contact.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        contact_id: z.string().describe('ID of the contact that was deleted.'),
        success: z.boolean().describe('True when Zoho confirmed the contact was deleted.'),
        message: z.string().describe('Human-readable result message from Zoho, e.g. "The customer has been deleted.".')
    })
    .describe('Result of deleting a Zoho Invoice contact.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a contact from the Zoho Invoice organization, which is not reversible through this API.
 * @pitfalls: A contact that has recorded transactions cannot be deleted and fails with provider error code 3000; deleting an already-deleted or nonexistent contact fails as not-found (error code 1002) rather than succeeding as a no-op.
 */
const action = createAction({
    description: 'Delete a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/contacts/#delete-a-contact
        const response = await nango.delete({
            endpoint: `/invoice/v3/contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                organization_id: input.organization_id
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- A replay after a lost response returns error 1002 (not found) and would report a completed deletion as a failure.
            retries: 0
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Invoice API.',
                details: parsedResponse.error.message
            });
        }

        const providerResponse = parsedResponse.data;

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        return {
            contact_id: input.contact_id,
            success: true,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
