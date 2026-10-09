import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z
    .object({
        salesorder_id: z.string().describe('Sales order ID to void. Example: "260815000000162161"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the sales order to void and, optionally, its Zoho Inventory organization.');

const ProviderVoidResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Zoho status code. 0 indicates the sales order was voided.'),
        message: z.string().describe('Human-readable result message from Zoho.')
    })
    .describe('Result of the sales order void operation.');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the organization list to resolve the organization ID, then permanently cancels the sales order, which Zoho does not allow to be un-voided.
 * @pitfalls: Voiding is irreversible; Zoho refuses to void a sales order that is already invoiced or paid, but re-voiding an already-void order still succeeds instead of erroring. When organization_id is omitted, the action fails if the Zoho account has multiple organizations.
 */
const action = createAction({
    description: 'Void (cancel) a Zoho Inventory sales order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.salesorders.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
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

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/salesorders/#void-a-sales-order
            endpoint: `/inventory/v1/salesorders/${encodeURIComponent(input.salesorder_id)}/status/void`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const body = ProviderVoidResponseSchema.parse(response.data);

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
