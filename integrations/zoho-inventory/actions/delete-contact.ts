import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact to delete. Example: "460000000026049"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for permanently deleting a contact from Zoho Inventory.');

const OutputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact that was deleted.'),
        success: z.boolean().describe('Whether Zoho Inventory confirmed that the contact was deleted.'),
        message: z.string().describe('Confirmation message returned by Zoho Inventory.')
    })
    .describe('Result of deleting a contact from Zoho Inventory.');

const DeleteContactResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

/**
 * @tags: [read, write, destructive]
 * @tagReason: Optionally reads the organization list to resolve organization_id, then permanently deletes the contact from Zoho Inventory.
 * @pitfalls: Deletion is permanent, and contacts with related transactions are refused (provider error code 3000); this refusal is not always clearable by deleting the transactions, because once a credit note has been applied to one of the contact's invoices the contact becomes permanently undeletable through the API.
 */
const action = createAction({
    description: 'Permanently delete a contact that has no transactions associated with it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.contacts.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const config: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/contacts/
            endpoint: `/inventory/v1/contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                organization_id: organizationId
            },
            // A replayed DELETE after a lost response would report the already-deleted contact as not found, so it is not retried.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.delete(config);
        const parsed = DeleteContactResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when deleting contact.',
                details: parsed.error.message
            });
        }

        const providerResponse = parsed.data;

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code,
                contact_id: input.contact_id
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
