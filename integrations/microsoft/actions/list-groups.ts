import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filter: z.string().optional().describe('OData filter expression'),
    select: z.string().optional().describe('Comma-separated list of properties to return'),
    top: z.number().optional().describe('Number of items to return per page (1-999). Default is 100.'),
    orderby: z.string().optional().describe('OData orderby expression'),
    cursor: z.string().optional().describe('Pagination URL from the previous response. Omit for the first page.')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    displayName: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    mail: z.string().optional().nullable(),
    mailNickname: z.string().optional().nullable(),
    groupTypes: z.array(z.string()).optional(),
    securityEnabled: z.boolean().optional(),
    mailEnabled: z.boolean().optional(),
    visibility: z.string().optional().nullable(),
    createdDateTime: z.string().optional().nullable(),
    renewedDateTime: z.string().optional().nullable(),
    expirationDateTime: z.string().optional().nullable()
});

const GroupSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    mail: z.string().optional(),
    mailNickname: z.string().optional(),
    groupTypes: z.array(z.string()).optional(),
    securityEnabled: z.boolean().optional(),
    mailEnabled: z.boolean().optional(),
    visibility: z.string().optional(),
    createdDateTime: z.string().optional(),
    renewedDateTime: z.string().optional(),
    expirationDateTime: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(GroupSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List groups from Microsoft',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['Group.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.filter) {
            params['$filter'] = input.filter;
        }

        if (input.select) {
            params['$select'] = input.select;
        }

        if (input.top !== undefined && input.top > 0 && input.top <= 999) {
            params['$top'] = input.top;
        }

        if (input.orderby) {
            params['$orderby'] = input.orderby;
        }

        let response;
        if (input.cursor) {
            // https://learn.microsoft.com/en-us/graph/api/group-list
            response = await nango.get({ endpoint: input.cursor, retries: 3 });
        } else {
            // https://learn.microsoft.com/en-us/graph/api/group-list
            response = await nango.get({ endpoint: '/v1.0/groups', params, retries: 3 });
        }

        const providerData = ProviderGroupSchema.array().safeParse(response.data?.value ?? []);

        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse groups response',
                errors: providerData.error.issues
            });
        }

        const groups = providerData.data.map((group) => ({
            id: group.id,
            ...(group.displayName != null && { displayName: group.displayName }),
            ...(group.description != null && { description: group.description }),
            ...(group.mail != null && { mail: group.mail }),
            ...(group.mailNickname != null && { mailNickname: group.mailNickname }),
            ...(group.groupTypes != null && { groupTypes: group.groupTypes }),
            ...(group.securityEnabled != null && { securityEnabled: group.securityEnabled }),
            ...(group.mailEnabled != null && { mailEnabled: group.mailEnabled }),
            ...(group.visibility != null && { visibility: group.visibility }),
            ...(group.createdDateTime != null && { createdDateTime: group.createdDateTime }),
            ...(group.renewedDateTime != null && { renewedDateTime: group.renewedDateTime }),
            ...(group.expirationDateTime != null && { expirationDateTime: group.expirationDateTime })
        }));

        return {
            items: groups,
            ...(response.data?.['@odata.nextLink'] != null && { nextCursor: response.data['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
