import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    creditnote_id: z.string().describe('Credit Note ID. Example: "260815000000111002"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const CreditNoteSchema = z.record(z.string(), z.unknown());

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    creditnote: CreditNoteSchema
});

const action = createAction({
    description: 'Retrieve a single credit note from Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: CreditNoteSchema,
    scopes: ['ZohoBooks.creditnotes.READ', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof CreditNoteSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
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
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        // https://www.zoho.com/books/api/v3/credit-notes/#get-a-credit-note
        const response = await nango.get({
            endpoint: `/books/v3/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return providerResponse.creditnote;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
