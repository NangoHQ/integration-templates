import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z
    .object({
        invoice_id: z.string().describe('Unique identifier of the invoice to delete. Example: "982000000567114"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the invoice to delete and, optionally, the organization that owns it.');

const OutputSchema = z
    .object({
        code: z.number().describe('Zoho response code; 0 indicates the invoice was deleted.'),
        message: z.string().describe('Human-readable result message from Zoho, for example "The invoice has been deleted."')
    })
    .describe('Result of the invoice deletion request.');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the organization list to resolve organization_id when it is not supplied, deletes the invoice in Zoho Inventory, and a provider delete is a difficult-to-reverse mutation.
 * @pitfalls: Deleting an invoice is permanent and cannot be undone; the provider rejects deletion when the invoice has payments or credit notes applied, and voiding the applied credit note does not unblock it.
 */
const action = createAction({
    description: 'Delete an invoice (only if it has no payments or credit notes applied).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.invoices.DELETE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/inventory/api/v1/organizations/
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Inventory.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const response = await nango.delete({
            // https://www.zoho.com/inventory/api/v1/invoices/#delete-an-invoice
            endpoint: `/inventory/v1/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 1
        });

        const body = z
            .object({
                code: z.number(),
                message: z.string()
            })
            .parse(response.data);

        if (body.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: body.message,
                code: body.code
            });
        }

        return {
            code: body.code,
            message: body.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
