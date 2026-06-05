import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    database: z.string().describe('Database name. Example: "NANGO_TEST_DB"')
});

const SchemaOutput = z.object({
    created_on: z.string().optional().describe('Schema creation timestamp in ISO 8601 format'),
    name: z.string().describe('Schema name'),
    is_default: z.boolean().describe('Whether this is the default schema'),
    is_current: z.boolean().describe('Whether this is the current schema'),
    database_name: z.string().describe('Database name'),
    owner: z.string().describe('Owner of the schema'),
    comment: z.string().optional().describe('Comment on the schema'),
    retention_time: z.string().optional().describe('Retention time in days')
});

const OutputSchema = z.object({
    schemas: z.array(SchemaOutput)
});

const RowTypeSchema = z
    .object({
        name: z.string()
    })
    .passthrough();

const ResultSetMetaDataSchema = z.object({
    numRows: z.number().optional(),
    format: z.string().optional(),
    rowType: z.array(RowTypeSchema),
    partitionInfo: z
        .array(
            z.object({
                rowCount: z.number(),
                uncompressedSize: z.number().optional(),
                compressedSize: z.number().optional()
            })
        )
        .optional()
});

const StatementResponseSchema = z.object({
    code: z.string(),
    message: z.string().optional(),
    statementHandle: z.string().optional(),
    statementStatusUrl: z.string().optional(),
    resultSetMetaData: ResultSetMetaDataSchema.optional(),
    data: z.array(z.array(z.unknown())).optional()
});

function parseTimestamp(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    const str = String(value);
    const seconds = parseFloat(str);
    if (Number.isNaN(seconds)) {
        return str;
    }
    return new Date(seconds * 1000).toISOString();
}

function parseBoolean(value: unknown): boolean {
    if (value === null || value === undefined) {
        return false;
    }
    const str = String(value).toUpperCase();
    return str === 'Y' || str === 'TRUE' || str === '1';
}

function getColumnValue(row: unknown[], columnIndex: Map<string, number>, columnName: string): unknown {
    const index = columnIndex.get(columnName);
    if (index === undefined) {
        return undefined;
    }
    return row[index];
}

const action = createAction({
    description: 'List schemas in a Snowflake database',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-schemas',
        group: 'Schemas'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const statement = `SHOW SCHEMAS IN DATABASE ${input.database}`;

        // https://docs.snowflake.com/en/developer-guide/sql-api/reference#post-apiv2statements
        const response = await nango.post({
            endpoint: '/api/v2/statements',
            data: {
                statement,
                database: input.database
            },
            retries: 3
        });

        const result = StatementResponseSchema.parse(response.data);

        if (!result.resultSetMetaData || !result.data) {
            return { schemas: [] };
        }

        const columns = result.resultSetMetaData.rowType.map((col) => col.name.toLowerCase());
        const columnIndex = new Map<string, number>();
        for (let i = 0; i < columns.length; i++) {
            const columnName = columns[i];
            if (columnName === undefined) {
                continue;
            }
            columnIndex.set(columnName, i);
        }

        const allRows = result.data;
        const partitionInfo = result.resultSetMetaData.partitionInfo || [];

        if (partitionInfo.length > 1 && result.statementHandle) {
            for (let partition = 1; partition < partitionInfo.length; partition++) {
                // https://docs.snowflake.com/en/developer-guide/sql-api/reference#get-apiv2statementsstatementhandle
                const partitionResponse = await nango.get({
                    endpoint: `/api/v2/statements/${encodeURIComponent(result.statementHandle)}`,
                    params: {
                        partition: String(partition)
                    },
                    retries: 3
                });

                const partitionResult = StatementResponseSchema.parse(partitionResponse.data);
                if (partitionResult.data) {
                    allRows.push(...partitionResult.data);
                }
            }
        }

        const schemas: z.infer<typeof SchemaOutput>[] = [];

        for (const row of allRows) {
            const name = getColumnValue(row, columnIndex, 'name');
            if (typeof name !== 'string') {
                continue;
            }

            if (name === 'INFORMATION_SCHEMA') {
                continue;
            }

            const commentValue = getColumnValue(row, columnIndex, 'comment');
            const retentionTimeValue = getColumnValue(row, columnIndex, 'retention_time');

            schemas.push({
                created_on: parseTimestamp(getColumnValue(row, columnIndex, 'created_on')),
                name,
                is_default: parseBoolean(getColumnValue(row, columnIndex, 'is_default')),
                is_current: parseBoolean(getColumnValue(row, columnIndex, 'is_current')),
                database_name: String(getColumnValue(row, columnIndex, 'database_name') ?? ''),
                owner: String(getColumnValue(row, columnIndex, 'owner') ?? ''),
                ...(commentValue !== null && commentValue !== undefined && String(commentValue) !== '' && { comment: String(commentValue) }),
                ...(retentionTimeValue !== null && retentionTimeValue !== undefined && { retention_time: String(retentionTimeValue) })
            });
        }

        return { schemas };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
