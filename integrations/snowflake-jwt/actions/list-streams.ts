import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    database: z.string().describe('Database name to list streams from. Example: "NANGO_TEST_DB"')
});

const StreamSchema = z.object({
    created_on: z.string().optional(),
    name: z.string().optional(),
    database_name: z.string().optional(),
    schema_name: z.string().optional(),
    owner: z.string().optional(),
    comment: z.string().optional(),
    table_name: z.string().optional(),
    source_type: z.string().optional(),
    type: z.string().optional(),
    stale: z.string().optional(),
    mode: z.string().optional()
});

const OutputSchema = z.object({
    streams: z.array(StreamSchema)
});

const SqlApiResponseSchema = z.object({
    data: z.array(z.array(z.unknown())).optional(),
    resultSetMetaData: z
        .object({
            rowType: z.array(z.object({ name: z.string() })).optional(),
            numRows: z.number().optional()
        })
        .optional(),
    code: z.string().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'List Snowflake streams (change data capture) in a database.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-streams'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.snowflake.com/en/developer-guide/sql-api/index
            endpoint: '/api/v2/statements',
            data: {
                statement: `SHOW STREAMS IN DATABASE ${input.database}`,
                timeout: 60
            },
            retries: 3
        };
        const response = await nango.post(config);

        const parsed = SqlApiResponseSchema.parse(response.data);
        const rows = parsed.data || [];
        const rowType = parsed.resultSetMetaData?.rowType || [];
        const columnIndex = new Map<string, number>();
        rowType.forEach((column, index) => {
            columnIndex.set(column.name, index);
        });

        const streams: z.infer<typeof StreamSchema>[] = [];
        rows.forEach((row) => {
            const getValue = (name: string): string | undefined => {
                const idx = columnIndex.get(name);
                if (idx === undefined) {
                    return undefined;
                }
                const value = row[idx];
                if (value === null || value === undefined) {
                    return undefined;
                }
                return String(value);
            };

            streams.push({
                ...(getValue('created_on') !== undefined && { created_on: getValue('created_on') }),
                ...(getValue('name') !== undefined && { name: getValue('name') }),
                ...(getValue('database_name') !== undefined && { database_name: getValue('database_name') }),
                ...(getValue('schema_name') !== undefined && { schema_name: getValue('schema_name') }),
                ...(getValue('owner') !== undefined && { owner: getValue('owner') }),
                ...(getValue('comment') !== undefined && { comment: getValue('comment') }),
                ...(getValue('table_name') !== undefined && { table_name: getValue('table_name') }),
                ...(getValue('source_type') !== undefined && { source_type: getValue('source_type') }),
                ...(getValue('type') !== undefined && { type: getValue('type') }),
                ...(getValue('stale') !== undefined && { stale: getValue('stale') }),
                ...(getValue('mode') !== undefined && { mode: getValue('mode') })
            });
        });

        return { streams };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
