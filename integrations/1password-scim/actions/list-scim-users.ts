import { z } from 'zod';
import { createAction } from 'nango';

const ScimEmailSchema = z.looseObject({
    value: z.string(),
    primary: z.boolean().optional(),
    type: z.string().optional()
});

const ScimNameSchema = z.looseObject({
    formatted: z.string().optional(),
    familyName: z.string().optional(),
    givenName: z.string().optional()
});

const ScimUserSchema = z.looseObject({
    id: z.string(),
    userName: z.string(),
    name: ScimNameSchema.optional(),
    displayName: z.string().optional(),
    active: z.boolean().optional(),
    emails: z.array(ScimEmailSchema).optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter: z.string().optional().describe('SCIM filter expression. Example: userName eq "user@example.com"'),
    count: z.number().int().min(1).max(100).optional().describe('Number of results to return per page.')
});

const OutputSchema = z.object({
    items: z.array(ScimUserSchema),
    totalResults: z.number().int().optional(),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List SCIM users from 1Password SCIM.',
    version: '1.1.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const startIndex = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(startIndex) || startIndex < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string'
            });
        }

        const params: Record<string, string | number> = {
            startIndex
        };

        if (input.filter !== undefined) {
            params['filter'] = input.filter;
        }

        if (input.count !== undefined) {
            params['count'] = input.count;
        }

        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Users',
            params,
            retries: 3
        });

        const ListResponseSchema = z.object({
            schemas: z.array(z.string()),
            totalResults: z.number().int(),
            startIndex: z.number().int().optional(),
            itemsPerPage: z.number().int().optional(),
            Resources: z.array(z.unknown())
        });

        const data = ListResponseSchema.parse(response.data);

        const users = data.Resources.map((resource) => {
            return ScimUserSchema.parse(resource);
        });

        const returnedStartIndex = data.startIndex ?? startIndex;
        const itemsPerPage = data.itemsPerPage ?? users.length;
        const nextStartIndex = returnedStartIndex + itemsPerPage;

        return {
            items: users,
            totalResults: data.totalResults,
            ...(nextStartIndex <= data.totalResults && { nextCursor: String(nextStartIndex) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
