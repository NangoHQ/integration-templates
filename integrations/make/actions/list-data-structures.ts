import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.number().describe('Team ID. Example: 2066772'),
    cursor: z.string().optional().describe('Pagination cursor (offset). Omit for the first page.'),
    limit: z.number().optional().describe('Max results per page. Defaults to 150.')
});

const DataStructureSchema = z
    .object({
        id: z.number(),
        teamId: z.number(),
        name: z.string(),
        strict: z.boolean().optional(),
        spec: z.array(z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    dataStructures: z.array(DataStructureSchema),
    pg: z.object({
        offset: z.number(),
        limit: z.number(),
        sortBy: z.string().optional(),
        sortDir: z.string().optional(),
        last: z.string().optional(),
        showLast: z.boolean().optional()
    })
});

const OutputSchema = z.object({
    dataStructures: z.array(DataStructureSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List data structures (schemas) for a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['udts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 150;
        const offset = input.cursor ? Number(input.cursor) : 0;
        if (input.cursor && Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric offset string'
            });
        }

        // https://developers.make.com/api-documentation/api-reference/data-structures.md
        const response = await nango.get({
            endpoint: '/data-structures',
            params: {
                teamId: String(input.teamId),
                'pg[limit]': String(limit),
                'pg[offset]': String(offset)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const pageOffset = providerResponse.pg.offset;
        const pageLimit = providerResponse.pg.limit;
        const nextCursor = providerResponse.dataStructures.length >= pageLimit ? String(pageOffset + pageLimit) : undefined;

        return {
            dataStructures: providerResponse.dataStructures,
            ...(nextCursor !== undefined && { nextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
