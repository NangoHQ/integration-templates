import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    count: z.number().int().min(1).max(1000).optional().describe('Number of results per page. Defaults to 100.'),
    filter: z.string().optional().describe('SCIM filter expression. Example: displayName co "Engineering"')
});

const MemberSchema = z.object({
    value: z.string().optional(),
    $ref: z.string().optional(),
    display: z.string().optional(),
    type: z.string().optional()
});

const MetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const GroupSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    externalId: z.string().optional(),
    meta: MetaSchema.optional(),
    displayName: z.string(),
    members: z.array(MemberSchema).optional()
});

const ListResponseSchema = z.object({
    schemas: z.array(z.string()),
    totalResults: z.number(),
    Resources: z.array(z.unknown()),
    startIndex: z.number().optional(),
    itemsPerPage: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(GroupSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List SCIM groups from 1Password SCIM.',
    version: '1.1.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scim'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let startIndex = 1;
        if (input.cursor !== undefined) {
            const parsed = Number(input.cursor);
            if (!Number.isInteger(parsed) || parsed < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a positive integer string'
                });
            }
            startIndex = parsed;
        }

        const count = input.count ?? 100;

        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Groups',
            params: {
                startIndex: String(startIndex),
                count: String(count),
                ...(input.filter && { filter: input.filter })
            },
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);

        const items = listResponse.Resources.map((resource) => {
            const group = GroupSchema.parse(resource);
            return group;
        });

        const currentStartIndex = listResponse.startIndex ?? startIndex;
        const currentItemsPerPage = listResponse.itemsPerPage ?? items.length;
        const hasMore = currentStartIndex + currentItemsPerPage - 1 < listResponse.totalResults;

        return {
            items,
            ...(hasMore && { nextCursor: String(currentStartIndex + currentItemsPerPage) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
