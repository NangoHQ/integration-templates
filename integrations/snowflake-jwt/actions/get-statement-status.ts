import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    statementHandle: z.string().describe('The handle of the SQL statement to check. Example: "01c4d2c3-0001-e881-001c-d6c3000130ea"')
});

const RowTypeSchema = z.object({
    name: z.string(),
    type: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    table: z.string().optional(),
    scale: z.number().nullable().optional(),
    precision: z.number().nullable().optional(),
    length: z.number().nullable().optional(),
    byteLength: z.number().nullable().optional(),
    nullable: z.boolean().optional(),
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

const OutputSchema = z.object({
    statementHandle: z.string(),
    sqlState: z.string().optional(),
    message: z.string().optional(),
    code: z.string().optional(),
    createdOn: z.number().optional(),
    statementStatusUrl: z.string().optional(),
    resultSetMetaData: ResultSetMetaDataSchema.optional(),
    data: z.array(z.array(z.unknown())).optional()
});

const action = createAction({
    description: 'Get Snowflake SQL statement execution status and inline results.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-statement-status',
        group: 'Statements'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.snowflake.com/en/developer-guide/sql-api/reference#get-statements
            endpoint: `/api/v2/statements/${encodeURIComponent(input.statementHandle)}`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
