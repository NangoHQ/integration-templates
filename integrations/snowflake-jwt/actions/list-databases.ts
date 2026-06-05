import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const ProviderDatabaseSchema = z.object({
    created_on: z.string().optional(),
    name: z.string(),
    is_default: z.string().optional(),
    is_current: z.string().optional(),
    origin: z.string().optional(),
    owner: z.string().optional(),
    comment: z.string().optional(),
    retention_time: z.string().optional(),
    kind: z.string().optional()
});

const OutputSchema = z.object({
    databases: z.array(ProviderDatabaseSchema)
});

const action = createAction({
    description: 'List Snowflake databases.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-databases'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.snowflake.com/en/developer-guide/sql-api/submitting-requests
            endpoint: '/api/v2/statements',
            data: {
                statement: 'SHOW DATABASES'
            },
            retries: 3
        };

        const response = await nango.post(config);

        const resultSetSchema = z.object({
            code: z.string(),
            resultSetMetaData: z.object({
                rowType: z.array(
                    z.object({
                        name: z.string()
                    })
                )
            }),
            data: z.array(z.array(z.unknown()))
        });

        const resultSet = resultSetSchema.parse(response.data);
        const columns = resultSet.resultSetMetaData.rowType.map((col) => col.name.toLowerCase());

        const databases = resultSet.data.map((row) => {
            const rowObject: Record<string, unknown> = {};
            for (const [i, col] of columns.entries()) {
                rowObject[col] = row[i];
            }
            return ProviderDatabaseSchema.parse(rowObject);
        });

        return {
            databases
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
