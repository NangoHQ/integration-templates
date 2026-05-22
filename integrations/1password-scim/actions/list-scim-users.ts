import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filter: z.string().optional().describe('SCIM filter query. Example: userName eq "john.doe@example.com"'),
    start_index: z.number().int().optional().describe('1-based index of the first result to return.'),
    count: z.number().int().optional().describe('Number of results to return per page.')
});

const ScimEmailSchema = z.object({
    value: z.string(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const ScimNameSchema = z.object({
    familyName: z.string().optional(),
    givenName: z.string().optional(),
    formatted: z.string().optional()
});

const ScimMetaSchema = z.object({
    created: z.string().optional(),
    lastModified: z.string().optional(),
    resourceType: z.string().optional()
});

const ScimUserSchema = z.object({
    id: z.string(),
    userName: z.string(),
    name: ScimNameSchema.optional(),
    emails: z.array(ScimEmailSchema).optional(),
    active: z.boolean().optional(),
    externalId: z.string().optional(),
    meta: ScimMetaSchema.optional(),
    schemas: z.array(z.string()).optional()
});

const ScimListResponseSchema = z.object({
    schemas: z.array(z.string()),
    totalResults: z.number().int(),
    startIndex: z.number().int().optional(),
    itemsPerPage: z.number().int().optional(),
    Resources: z.array(z.unknown())
});

const OutputSchema = z.object({
    users: z.array(ScimUserSchema),
    total_results: z.number().int(),
    start_index: z.number().int().optional(),
    items_per_page: z.number().int().optional(),
    next_start_index: z.number().int().optional()
});

const action = createAction({
    description: 'List SCIM users from 1Password SCIM.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-scim-users',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Users',
            params: {
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.start_index !== undefined && { startIndex: String(input.start_index) }),
                ...(input.count !== undefined && { count: String(input.count) })
            },
            retries: 3
        });

        const listResponse = ScimListResponseSchema.parse(response.data);

        const users = listResponse.Resources.map((resource: unknown) => {
            return ScimUserSchema.parse(resource);
        });

        const startIndex = listResponse.startIndex ?? 1;
        const itemsPerPage = listResponse.itemsPerPage ?? users.length;
        const hasMore = startIndex + itemsPerPage - 1 < listResponse.totalResults;
        const nextStartIndex = hasMore ? startIndex + itemsPerPage : undefined;

        return {
            users,
            total_results: listResponse.totalResults,
            start_index: listResponse.startIndex,
            items_per_page: listResponse.itemsPerPage,
            ...(nextStartIndex !== undefined && { next_start_index: nextStartIndex })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
