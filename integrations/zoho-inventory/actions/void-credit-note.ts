import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z
    .object({
        creditnote_id: z.string().describe('ID of the credit note to void. Example: "260815000000162145"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the credit note to void and, optionally, the organization that owns it.');

const ProviderVoidResponseSchema = z.object({
    code: z.number().optional(),
    creditnote_id: z.string().optional(),
    creditnote_number: z.string().optional(),
    status: z.string().optional(),
    message: z.string().optional()
});

const OutputSchema = z
    .object({
        creditnote_id: z.string().optional().describe('ID of the voided credit note, when returned by the provider.'),
        creditnote_number: z.string().optional().describe('Human-readable credit note number, when returned by the provider. Example: "CN-00026"'),
        status: z.string().optional().describe('Credit note status after the operation, when returned by the provider. Example: "void"'),
        message: z.string().optional().describe('Confirmation message returned by the provider. Example: "The credit note has been marked as void."')
    })
    .describe('Confirmation that the credit note was voided.');

/**
 * @tags: [write, destructive]
 * @tagReason: Voids a credit note, a state change that cancels the financial document.
 * @pitfalls: Voiding is idempotent, so an already-void credit note still returns success; a credit note whose credits have been applied to an invoice or refunded is permanently rejected and cannot be voided. On success the provider returns only a confirmation message, so the optional creditnote_id, creditnote_number, and status fields are usually absent.
 */
const action = createAction({
    description: 'Void a Zoho Inventory credit note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.creditnotes.ALL', 'ZohoInventory.settings.READ'],

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
            // https://www.zoho.com/inventory/api/v1/credit-notes/#void-a-credit-note
            endpoint: `/inventory/v1/creditnotes/${encodeURIComponent(input.creditnote_id)}/void`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerResponse = ProviderVoidResponseSchema.parse(response.data);

        if (providerResponse.code !== undefined && providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message ?? 'Failed to void the credit note.',
                code: providerResponse.code
            });
        }

        return {
            ...(providerResponse.creditnote_id !== undefined && { creditnote_id: providerResponse.creditnote_id }),
            ...(providerResponse.creditnote_number !== undefined && { creditnote_number: providerResponse.creditnote_number }),
            ...(providerResponse.status !== undefined && { status: providerResponse.status }),
            ...(providerResponse.message !== undefined && { message: providerResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
