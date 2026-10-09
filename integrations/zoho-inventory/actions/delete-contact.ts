import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact to delete. Example: "460000000026049"'),
        organization_id: z
            .string()
            .optional()
            .describe('Zoho Inventory organization ID. Defaults to the first organization available on the connection when omitted.')
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

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(
        z.object({
            organization_id: z.string()
        })
    )
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
    scopes: ['ZohoInventory.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;

        if (organizationId === undefined) {
            // https://www.zoho.com/inventory/api/v1/organizations/
            const organizationsResponse = await nango.get({
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });

            const organizations = OrganizationsResponseSchema.parse(organizationsResponse.data).organizations;
            const firstOrganization = organizations[0];

            if (firstOrganization === undefined) {
                throw new nango.ActionError({
                    type: 'organization_not_found',
                    message: 'No Zoho Inventory organization is available on this connection.'
                });
            }

            organizationId = firstOrganization.organization_id;
        }

        const config: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/contacts/
            endpoint: `/inventory/v1/contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                organization_id: organizationId
            },
            // DELETE by ID is idempotent: a retry cannot create or duplicate anything, it can only report an already-deleted contact as not found.
            retries: 3
        };

        const response = await nango.delete(config);
        const providerResponse = DeleteContactResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: providerResponse.message,
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
