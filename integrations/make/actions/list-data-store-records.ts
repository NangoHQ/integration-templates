import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataStoreId: z.number().describe('Data store ID. Example: 141641'),
    limit: z.number().optional().describe('Page size. Default: 10'),
    cursor: z.string().optional().describe('Pagination offset from the previous response. Omit for the first page.')
});

const PgSchema = z
    .object({
        limit: z.number(),
        offset: z.number(),
        sortBy: z.string().optional(),
        sortDir: z.string().optional(),
        returnTotalCount: z.boolean().optional()
    })
    .passthrough();

const ProviderRecordSchema = z.object({
    key: z.string(),
    data: z.record(z.string(), z.unknown())
});

const ProviderResponseSchema = z.object({
    records: z.array(ProviderRecordSchema),
    spec: z.unknown().optional(),
    strict: z.boolean().optional(),
    count: z.number(),
    pg: PgSchema.optional()
});

const OutputSchema = z.object({
    records: z.array(ProviderRecordSchema),
    spec: z.unknown().optional(),
    strict: z.boolean().optional(),
    count: z.number(),
    pg: PgSchema.optional(),
    nextOffset: z.number().optional()
});

const action = createAction({
    description: 'List records stored in a data store.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['datastores:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? Number(input.cursor) : 0;
        if (!Number.isInteger(offset) || offset < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid non-negative integer offset string'
            });
        }
        const limit = input.limit ?? 10;

        // https://developers.make.com/api-documentation/
        const response = await nango.get({
            endpoint: `/data-stores/${encodeURIComponent(input.dataStoreId)}/data`,
            params: {
                ...(limit !== 10 && { 'pg[limit]': String(limit) }),
                ...(offset > 0 && { 'pg[offset]': String(offset) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const currentOffset = providerResponse.pg?.offset ?? 0;
        const currentLimit = providerResponse.pg?.limit ?? 10;
        const nextOffset = providerResponse.count > currentOffset + providerResponse.records.length ? currentOffset + currentLimit : undefined;

        return {
            records: providerResponse.records,
            ...(providerResponse.spec !== undefined && { spec: providerResponse.spec }),
            ...(providerResponse.strict !== undefined && { strict: providerResponse.strict }),
            count: providerResponse.count,
            ...(providerResponse.pg !== undefined && { pg: providerResponse.pg }),
            ...(nextOffset !== undefined && { nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
