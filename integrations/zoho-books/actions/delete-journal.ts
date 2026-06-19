import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    journal_id: z.string().describe('The ID of the manual journal entry to delete. Example: "260815000000115005"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const OutputSchema = z.object({
    journal_id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a manual journal entry in Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.fullaccess.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
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

        // https://www.zoho.com/books/api/v3/journals/#delete-a-journal
        const response = await nango.delete({
            endpoint: `/books/v3/journals/${encodeURIComponent(input.journal_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const responseSchema = z.object({
            code: z.number().optional(),
            message: z.string().optional()
        });

        const parsedResponse = responseSchema.parse(response.data);

        if (parsedResponse.code !== undefined && parsedResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsedResponse.message || 'Failed to delete journal',
                code: parsedResponse.code
            });
        }

        return {
            journal_id: input.journal_id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
