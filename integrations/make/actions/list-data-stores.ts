import { z } from 'zod';
import { createAction } from 'nango';

const DataStoreSchema = z.object({
    id: z.number(),
    name: z.string(),
    records: z.number(),
    size: z.string(),
    maxSize: z.string(),
    teamId: z.number()
});

const PgSchema = z.object({
    sortBy: z.string(),
    limit: z.number(),
    sortDir: z.string(),
    offset: z.number()
});

const InputSchema = z.object({
    teamId: z.number().describe('Team ID. Example: 2066772'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.')
});

const OutputSchema = z.object({
    dataStores: z.array(DataStoreSchema),
    pg: PgSchema,
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List data stores for a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['datastores:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.make.com/api-documentation/
            endpoint: '/data-stores',
            params: {
                teamId: input.teamId,
                ...(input.cursor !== undefined && { 'pg[offset]': Number(input.cursor) })
            },
            retries: 3
        });

        const rawResponse = z
            .object({
                dataStores: z.array(z.unknown()),
                pg: z.unknown()
            })
            .parse(response.data);

        const dataStores = z.array(DataStoreSchema).parse(rawResponse.dataStores);
        const pg = PgSchema.parse(rawResponse.pg);

        const nextCursor = dataStores.length >= pg.limit ? String(pg.offset + pg.limit) : undefined;

        return {
            dataStores,
            pg,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
