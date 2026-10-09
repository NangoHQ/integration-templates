import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        salesorder_id: z.string().describe('ID of the sales order to delete. Example: "260815000000161134".'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. Omit to use the organization discovered from the connection (required when the account has multiple organizations). Example: "927270289".'
            )
    })
    .describe('Input for deleting a Zoho Inventory sales order.');

const OrganizationListSchema = z.object({
    organizations: z.array(
        z.object({
            organization_id: z.string()
        })
    )
});

const DeleteResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the sales order was deleted.'),
        salesorder_id: z.string().describe('ID of the deleted sales order.'),
        message: z.string().describe('Confirmation message returned by Zoho Inventory.')
    })
    .describe('Result of deleting a Zoho Inventory sales order.');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the organization list to discover the organization ID when it is not supplied, and permanently deletes a sales order (write + destructive).
 * @pitfalls: Deletion is permanent and cannot be undone, and the provider refuses it while the sales order has dependent invoices or packages; organization_id auto-discovery uses the first organization returned, so pass it explicitly on multi-organization accounts.
 */
const action = createAction({
    description: 'Delete a sales order (only if it has no dependent invoices/packages).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.salesorders.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;

        if (!organizationId) {
            // https://www.zoho.com/inventory/api/v1/organizations/
            const organizationsResponse = await nango.get({
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });

            const organizations = OrganizationListSchema.parse(organizationsResponse.data);
            const organization = organizations.organizations[0];

            if (!organization) {
                throw new nango.ActionError({
                    type: 'organization_not_found',
                    message: 'No Zoho Inventory organization is available for this connection.'
                });
            }

            organizationId = organization.organization_id;
        }

        // https://www.zoho.com/inventory/api/v1/salesorders/
        const response = await nango.delete({
            endpoint: `/inventory/v1/salesorders/${encodeURIComponent(input.salesorder_id)}`,
            params: {
                organization_id: organizationId
            },
            // Deleting a sales order is not idempotent: retrying after a lost response could resend the mutation.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const deleted = DeleteResponseSchema.parse(response.data);

        return {
            success: true,
            salesorder_id: input.salesorder_id,
            message: deleted.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
