import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact to mark as inactive. Example: "460000000026049"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist. Example: "10234695"'
            )
    })
    .describe('Input for marking a contact as inactive.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        contact_id: z.string().describe('ID of the contact that was marked inactive. Example: "460000000026049"'),
        success: z.boolean().describe('Whether the provider confirmed the contact was marked inactive.'),
        message: z.string().describe('Confirmation message from the provider. Example: "The contact has been marked as inactive."')
    })
    .describe('Result of marking a contact as inactive.');

/**
 * @tags: [write]
 * @tagReason: Changes the contact's status to inactive on the provider, a reversible state change rather than a deletion.
 * @pitfalls: Marking a contact inactive hides it from default active-only views but does not delete it or its transactions and is reversible by marking it active again; re-running on an already-inactive contact still succeeds, and the operation requires the contacts CREATE scope rather than an update scope.
 */
const action = createAction({
    description: 'Mark a contact as inactive in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.contacts.CREATE', 'ZohoInventory.settings.READ'],

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

        const contactId = input.contact_id;

        // Marking inactive is idempotent (re-running on an inactive contact still returns success), so retries are safe.
        // https://www.zoho.com/inventory/api/v1/contacts/#mark-as-inactive
        const response = await nango.post({
            endpoint: `/inventory/v1/contacts/${encodeURIComponent(contactId)}/inactive`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API.',
                details: parsedResponse.error.message
            });
        }

        const providerResponse = parsedResponse.data;

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code,
                contact_id: contactId
            });
        }

        return {
            contact_id: contactId,
            success: providerResponse.code === 0,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
