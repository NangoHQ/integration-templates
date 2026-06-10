import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    journal_id: z.string().describe('The ID of the manual journal entry to delete. Example: "260815000000115005"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const OutputSchema = z.object({
    journal_id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a manual journal entry in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-journal',
        group: 'Journals'
    },
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
            const firstOrg = orgData.organizations?.[0];
            if (orgData.code !== 0 || !firstOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = firstOrg.organization_id;
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
