import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filter: z.string().optional().describe('OData filter query. Example: "startswith(displayName,\'John\')"'),
    select: z.string().optional().describe('Comma-separated list of properties to return. Example: "id,displayName,mail"'),
    top: z.number().int().min(1).max(999).optional().describe('Number of users to return (1-999). Default: 100'),
    orderby: z.string().optional().describe('Order by clause. Example: "displayName"'),
    cursor: z.string().optional().describe('Pagination cursor (skipToken) from previous response. Omit for first page.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    mail: z.string().nullable().optional(),
    userPrincipalName: z.string().optional(),
    givenName: z.string().nullable().optional(),
    surname: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    officeLocation: z.string().nullable().optional(),
    mobilePhone: z.string().nullable().optional(),
    businessPhones: z.array(z.string()).nullable().optional(),
    accountEnabled: z.boolean().nullable().optional(),
    createdDateTime: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    mail: z.string().optional(),
    userPrincipalName: z.string().optional(),
    givenName: z.string().optional(),
    surname: z.string().optional(),
    jobTitle: z.string().optional(),
    officeLocation: z.string().optional(),
    mobilePhone: z.string().optional(),
    businessPhones: z.array(z.string()).optional(),
    accountEnabled: z.boolean().optional(),
    createdDateTime: z.string().optional()
});

const ListOutputSchema = z.object({
    users: z.array(OutputSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List users from Microsoft',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['User.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.filter) {
            params['$filter'] = input.filter;
        }
        if (input.select) {
            params['$select'] = input.select;
        }
        if (input.top) {
            params['$top'] = input.top;
        }
        if (input.orderby) {
            params['$orderby'] = input.orderby;
        }
        let response;
        if (input.cursor) {
            // https://learn.microsoft.com/en-us/graph/api/user-list
            response = await nango.get({ endpoint: input.cursor, retries: 3 });
        } else {
            // https://learn.microsoft.com/en-us/graph/api/user-list
            response = await nango.get({ endpoint: '/v1.0/users', params, retries: 3 });
        }

        const data = ProviderResponseSchema.parse(response.data);

        const users = data.value.map((item) => {
            const user = ProviderUserSchema.parse(item);
            return {
                id: user.id,
                ...(user.displayName != null && { displayName: user.displayName }),
                ...(user.mail != null && { mail: user.mail }),
                ...(user.userPrincipalName !== undefined && { userPrincipalName: user.userPrincipalName }),
                ...(user.givenName != null && { givenName: user.givenName }),
                ...(user.surname != null && { surname: user.surname }),
                ...(user.jobTitle != null && { jobTitle: user.jobTitle }),
                ...(user.officeLocation != null && { officeLocation: user.officeLocation }),
                ...(user.mobilePhone != null && { mobilePhone: user.mobilePhone }),
                ...(user.businessPhones != null && { businessPhones: user.businessPhones }),
                ...(user.accountEnabled != null && { accountEnabled: user.accountEnabled }),
                ...(user.createdDateTime != null && { createdDateTime: user.createdDateTime })
            };
        });

        const nextCursor = data['@odata.nextLink'] || undefined;

        return {
            users,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
