import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    query: z.string().min(1),
    incremental_column: z.string().min(1),
    id_column: z.string().min(1),
    database: z.string().optional(),
    schema: z.string().optional(),
    warehouse: z.string().optional(),
    role: z.string().optional()
});

const CheckpointSchema = z.object({
    last_value: z.string()
});

const QueryResultSchema = z.object({
    id: z.string(),
    row_data: z.record(z.string(), z.unknown())
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
    byteLength: z.number().nullable().optional(),
    nullable: z.boolean().optional(),
    collation: z.string().nullable().optional()
});

const PartitionInfoSchema = z.object({
    rowCount: z.number(),
    uncompressedSize: z.number().optional(),
    compressedSize: z.number().optional()
});

const ResultSetMetaDataSchema = z.object({
    numRows: z.number().optional(),
    format: z.string().optional(),
    rowType: z.array(RowTypeSchema).optional(),
    partitionInfo: z.array(PartitionInfoSchema).optional()
});

const ResultSetSchema = z.object({
    code: z.string(),
    sqlState: z.string().optional(),
    message: z.string().optional(),
    statementHandle: z.string(),
    statementHandles: z.array(z.string()).optional(),
    createdOn: z.number().optional(),
    statementStatusUrl: z.string().optional(),
    resultSetMetaData: ResultSetMetaDataSchema.optional(),
    data: z.array(z.array(z.unknown())).optional(),
    stats: z.record(z.string(), z.unknown()).optional()
});

const QueryStatusSchema = z.object({
    code: z.string(),
    sqlState: z.string().optional(),
    message: z.string().optional(),
    statementHandle: z.string(),
    statementStatusUrl: z.string().optional()
});

function buildQuery(
    baseQuery: string,
    incrementalColumn: string,
    lastValue: string | undefined
): { query: string; bindings: Record<string, { type: string; value: string }> | undefined } {
    if (!lastValue) {
        return { query: baseQuery, bindings: undefined };
    }

    const wrappedQuery = `SELECT * FROM (${baseQuery}) AS _nango_sync WHERE "${incrementalColumn}" > ? ORDER BY "${incrementalColumn}" ASC`;
    return {
        query: wrappedQuery,
        bindings: {
            '1': { type: 'TEXT', value: lastValue }
        }
    };
}

function isNumericType(type: string | undefined): boolean {
    if (!type) {
        return false;
    }
    const upper = type.toUpperCase();
    return upper === 'FIXED' || upper === 'REAL' || upper === 'FLOAT' || upper === 'NUMBER' || upper === 'DECFLOAT' || upper === 'INTEGER';
}

function compareValues(current: string | undefined, newValue: unknown, columnType: string | undefined): string | undefined {
    if (newValue === null || newValue === undefined) {
        return current;
    }

    const strValue = String(newValue);

    if (isNumericType(columnType)) {
        const currentNum = current !== undefined ? Number(current) : Number.NEGATIVE_INFINITY;
        const newNum = Number(newValue);
        if (!Number.isNaN(newNum) && newNum > currentNum) {
            return strValue;
        }
        return current;
    }

    if (current === undefined || strValue > current) {
        return strValue;
    }

    return current;
}

function getRecordId(rowData: Record<string, unknown>, idColumn: string): string {
    const idValue = rowData[idColumn];
    if (idValue !== undefined && idValue !== null) {
        return String(idValue);
    }

    throw new Error(`Configured id_column "${idColumn}" not found in query result row`);
}

const sync = createSync({
    description: 'Sync rows from a customer-configured SELECT query.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        QueryResult: QueryResultSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/query-results'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error(`Invalid metadata: ${parsedMetadata.error.message}`);
        }

        const { query: baseQuery, incremental_column, id_column, database, schema, warehouse, role } = parsedMetadata.data;

        const checkpoint = await nango.getCheckpoint();
        const lastValue = checkpoint?.last_value;

        const { query, bindings } = buildQuery(baseQuery, incremental_column, lastValue);

        // https://docs.snowflake.com/en/developer-guide/sql-api/reference
        const postResponse = await nango.post({
            endpoint: '/api/v2/statements',
            data: {
                statement: query,
                ...(bindings && { bindings }),
                ...(database && { database }),
                ...(schema && { schema }),
                ...(warehouse && { warehouse }),
                ...(role && { role })
            },
            retries: 3
        });

        let currentResponse = postResponse;
        const parsedPost = ResultSetSchema.or(QueryStatusSchema).safeParse(postResponse.data);
        if (!parsedPost.success) {
            throw new Error(`Unexpected response from Snowflake SQL API: ${parsedPost.error.message}`);
        }

        const initialData = parsedPost.data;

        let statementHandle: string | undefined;
        if ('statementHandle' in initialData) {
            statementHandle = initialData.statementHandle;
        }

        if (postResponse.status === 202) {
            if (!statementHandle) {
                throw new Error('Statement handle missing from async response');
            }

            let pollCount = 0;
            const maxPolls = 30;

            while (pollCount < maxPolls) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                });

                // https://docs.snowflake.com/en/developer-guide/sql-api/reference
                const pollResponse = await nango.get({
                    endpoint: `/api/v2/statements/${encodeURIComponent(statementHandle)}`,
                    retries: 3
                });

                currentResponse = pollResponse;
                const parsedPoll = ResultSetSchema.or(QueryStatusSchema).safeParse(pollResponse.data);
                if (!parsedPoll.success) {
                    throw new Error(`Unexpected poll response from Snowflake SQL API: ${parsedPoll.error.message}`);
                }

                const pollData = parsedPoll.data;

                if (pollResponse.status === 200 && 'data' in pollData) {
                    statementHandle = pollData.statementHandle;
                    break;
                }

                if (pollResponse.status === 422) {
                    throw new Error(`Statement execution failed: ${pollData.message || 'Unknown error'}`);
                }

                pollCount += 1;
            }

            if (pollCount >= maxPolls) {
                throw new Error('Statement polling timed out');
            }
        }

        const parsedFinal = ResultSetSchema.safeParse(currentResponse.data);
        if (!parsedFinal.success) {
            throw new Error(`Unexpected final response from Snowflake SQL API: ${parsedFinal.error.message}`);
        }

        const resultSet = parsedFinal.data;
        const handle = resultSet.statementHandle;
        const metaData = resultSet.resultSetMetaData;
        const columns = metaData?.rowType || [];
        const partitionInfo = metaData?.partitionInfo || [];
        let allRows: unknown[][] = resultSet.data || [];

        for (let partitionIndex = 1; partitionIndex < partitionInfo.length; partitionIndex += 1) {
            // https://docs.snowflake.com/en/developer-guide/sql-api/reference
            const partitionResponse = await nango.get({
                endpoint: `/api/v2/statements/${encodeURIComponent(handle)}`,
                params: {
                    partition: partitionIndex
                },
                retries: 3
            });

            const parsedPartition = ResultSetSchema.safeParse(partitionResponse.data);
            if (!parsedPartition.success) {
                throw new Error(`Unexpected partition response from Snowflake SQL API: ${parsedPartition.error.message}`);
            }

            const partitionData = parsedPartition.data;
            allRows = allRows.concat(partitionData.data || []);
        }

        const records: { id: string; row_data: Record<string, unknown> }[] = [];
        let maxValue: string | undefined;

        const incrementalType = columns.find((col) => col.name === incremental_column)?.type;

        for (const row of allRows) {
            const rowData: Record<string, unknown> = {};
            for (let colIndex = 0; colIndex < columns.length; colIndex += 1) {
                const column = columns[colIndex];
                if (column) {
                    rowData[column.name] = row[colIndex];
                }
            }

            const id = getRecordId(rowData, id_column);
            records.push({ id, row_data: rowData });

            const incValue = rowData[incremental_column];
            maxValue = compareValues(maxValue, incValue, incrementalType);
        }

        if (records.length > 0) {
            await nango.batchSave(records, 'QueryResult');
        }

        if (maxValue !== undefined) {
            await nango.saveCheckpoint({ last_value: maxValue });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
