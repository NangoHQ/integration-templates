import { z } from 'zod';
import { createAction } from 'nango';

const BindingSchema = z.object({
    type: z.string(),
    value: z.string()
});

const InputSchema = z.object({
    statement: z.string(),
    timeout: z.number().optional(),
    warehouse: z.string().optional(),
    database: z.string().optional(),
    schema: z.string().optional(),
    role: z.string().optional(),
    bindings: z.record(z.string(), BindingSchema).optional()
});

const RowTypeSchema = z.object({
    name: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    table: z.string().optional(),
    type: z.string(),
    scale: z.number().nullable().optional(),
    precision: z.number().nullable().optional(),
    length: z.number().nullable().optional(),
    nullable: z.boolean(),
    byteLength: z.number().nullable().optional(),
    collation: z.string().nullable().optional()
});

const PartitionInfoSchema = z.object({
    rowCount: z.number(),
    uncompressedSize: z.number(),
    compressedSize: z.number().optional()
});

const ResultSetMetaDataSchema = z.object({
    numRows: z.number().optional(),
    format: z.string().optional(),
    rowType: z.array(RowTypeSchema).optional(),
    partitionInfo: z.array(PartitionInfoSchema).optional()
});

const StatsSchema = z.object({
    numRowsInserted: z.number().optional(),
    numRowsUpdated: z.number().optional(),
    numRowsDeleted: z.number().optional(),
    numDuplicateRowsUpdated: z.number().optional(),
    numRowsUnloaded: z.number().optional(),
    numBytesUnloaded: z.number().optional()
});

const OutputSchema = z.object({
    code: z.string(),
    sqlState: z.string().optional(),
    message: z.string(),
    statementHandle: z.string(),
    statementHandles: z.array(z.string()).optional(),
    statementStatusUrl: z.string(),
    createdOn: z.number().optional(),
    resultSetMetaData: ResultSetMetaDataSchema.optional(),
    data: z.array(z.array(z.unknown())).optional(),
    stats: StatsSchema.optional()
});

const action = createAction({
    description: 'Submit a SQL statement to Snowflake.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/execute-statement',
        group: 'SQL'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.snowflake.com/en/developer-guide/sql-api/reference
        const response = await nango.post({
            endpoint: '/api/v2/statements',
            data: {
                statement: input.statement,
                ...(input.timeout !== undefined && { timeout: input.timeout }),
                ...(input.warehouse !== undefined && { warehouse: input.warehouse }),
                ...(input.database !== undefined && { database: input.database }),
                ...(input.schema !== undefined && { schema: input.schema }),
                ...(input.role !== undefined && { role: input.role }),
                ...(input.bindings !== undefined && { bindings: input.bindings })
            },
            retries: 3
        });

        const result = OutputSchema.safeParse(response.data);
        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Snowflake SQL API',
                details: result.error.format()
            });
        }

        return result.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
