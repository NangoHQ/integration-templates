import { z } from 'zod';
import { createAction } from 'nango';

const USER_FIELDS = 'systemuserid,fullname,firstname,lastname,internalemailaddress,domainname,jobtitle,isdisabled,islicensed,createdon,modifiedon';

const InputSchema = z
    .object({
        filter: z.string().optional().describe('OData filter expression over systemuser attribute logical names. Example: "isdisabled eq false"'),
        orderby: z.string().optional().describe('OData order by expression. Example: "fullname asc"'),
        top: z.number().int().positive().optional().describe('Maximum number of users to return. Example: 50'),
        cursor: z.string().optional().describe('Opaque pagination cursor from a previous response next_cursor. Omit for the first page.')
    })
    .describe('Filters for listing Dataverse system users');

const UserSchema = z.object({
    id: z.string().describe('System user ID (systemuserid). Example: "9f1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"'),
    fullname: z.string().optional().describe('Full display name of the user. Example: "Ada Lovelace"'),
    firstname: z.string().optional().describe('First name of the user'),
    lastname: z.string().optional().describe('Last name of the user'),
    internalemailaddress: z.string().optional().describe('Primary internal email address of the user. Example: "ada@fabrikam.com"'),
    domainname: z
        .string()
        .optional()
        .describe('Domain login of the user, typically the Microsoft Entra user principal name. Example: "ada@fabrikam.onmicrosoft.com"'),
    jobtitle: z.string().optional().describe('Job title of the user. Example: "Sales Manager"'),
    isdisabled: z.boolean().optional().describe('Whether the user account is disabled'),
    islicensed: z.boolean().optional().describe('Whether the user is licensed for Dynamics 365'),
    createdon: z.string().optional().describe('ISO 8601 timestamp when the user record was created. Example: "2026-01-15T08:30:00Z"'),
    modifiedon: z.string().optional().describe('ISO 8601 timestamp when the user record was last modified. Example: "2026-03-10T14:05:00Z"')
});

const OutputSchema = z
    .object({
        users: z.array(UserSchema).describe('System users matching the query'),
        next_cursor: z.string().optional().describe('Cursor to pass back as the cursor input to fetch the next page; omitted when no further page exists')
    })
    .describe('Page of Dataverse system users');

const DataverseUserSchema = z.object({
    systemuserid: z.string(),
    fullname: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    internalemailaddress: z.string().nullable().optional(),
    domainname: z.string().nullable().optional(),
    jobtitle: z.string().nullable().optional(),
    isdisabled: z.boolean().nullable().optional(),
    islicensed: z.boolean().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string().nullable().optional()
});

const DataverseListResponseSchema = z.object({
    value: z.array(DataverseUserSchema),
    '@odata.nextLink': z.string().optional()
});

function toOptional<T>(value: T | null | undefined): T | undefined {
    return value ?? undefined;
}

function extractNextCursor(nextLink: string | undefined): string | undefined {
    if (!nextLink) {
        return undefined;
    }
    const queryStart = nextLink.indexOf('?');
    if (queryStart === -1) {
        return undefined;
    }
    return new URLSearchParams(nextLink.slice(queryStart + 1)).get('$skiptoken') ?? undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only reads Dataverse systemuser records through a single GET request; it never mutates provider data.
 * @pitfalls: Results include disabled users and non-interactive application or service accounts, which may have no email address; pass a filter such as "isdisabled eq false" to restrict the list to active users.
 */
const action = createAction({
    description: 'List Dataverse system users (read-only)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_impersonation'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
        const response = await nango.get({
            endpoint: '/api/data/v9.2/systemusers',
            params: {
                $select: USER_FIELDS,
                ...(input.filter !== undefined && { $filter: input.filter }),
                ...(input.orderby !== undefined && { $orderby: input.orderby }),
                ...(input.top !== undefined && { $top: input.top }),
                ...(input.cursor !== undefined && { $skiptoken: input.cursor })
            },
            retries: 3
        });

        const parsed = DataverseListResponseSchema.parse(response.data);
        const nextCursor = extractNextCursor(parsed['@odata.nextLink']);

        return {
            users: parsed.value.map((user) => ({
                id: user.systemuserid,
                fullname: toOptional(user.fullname),
                firstname: toOptional(user.firstname),
                lastname: toOptional(user.lastname),
                internalemailaddress: toOptional(user.internalemailaddress),
                domainname: toOptional(user.domainname),
                jobtitle: toOptional(user.jobtitle),
                isdisabled: toOptional(user.isdisabled),
                islicensed: toOptional(user.islicensed),
                createdon: toOptional(user.createdon),
                modifiedon: toOptional(user.modifiedon)
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
