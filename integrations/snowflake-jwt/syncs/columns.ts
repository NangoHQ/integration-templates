import { createSync } from 'nango';
import { z } from 'zod';

const DataTypeJsonSchema = z
    .object({
        type: z.string().optional(),
        precision: z.number().optional(),
        scale: z.number().optional(),
        byteLength: z.number().optional(),
        length: z.number().optional(),
        nullable: z.boolean().optional()
    })
    .passthrough();

const ColumnSchema = z.object({
    id: z.string(),
    database_name: z.string(),
    schema_name: z.string(),
    table_name: z.string(),
    column_name: z.string(),
    ordinal_position: z.number().optional(),
    data_type: z.string().optional(),
    data_type_type: z.string().optional(),
    data_type_precision: z.number().optional(),
    data_type_scale: z.number().optional(),
    data_type_byte_length: z.number().optional(),
    data_type_length: z.number().optional(),
    nullable: z.boolean().optional(),
    default_value: z.string().optional(),
    kind: z.string().optional(),
    expression: z.string().optional(),
    comment: z.string().optional(),
    autoincrement: z.string().optional()
});

const CheckpointSchema = z.object({
    database: z.string(),
    schema: z.string(),
    table: z.string(),
    column_name: z.string()
});

const StatementResponseSchema = z
    .object({
        code: z.string().optional(),
        message: z.string().optional(),
        statementHandle: z.string().optional(),
        statementStatusUrl: z.string().optional(),
        data: z.array(z.array(z.unknown())).optional(),
        resultSetMetaData: z
            .object({
                rowType: z
                    .array(
                        z.object({
                            name: z.string(),
                            type: z.string().nullable().optional(),
                            precision: z.number().nullable().optional(),
                            scale: z.number().nullable().optional(),
                            byteLength: z.number().nullable().optional(),
                            length: z.number().nullable().optional(),
                            nullable: z.boolean().nullable().optional()
                        })
                    )
                    .optional(),
                partitionInfo: z
                    .array(
                        z.object({
                            rowCount: z.number().optional()
                        })
                    )
                    .optional(),
                numPartitions: z.number().optional()
            })
            .optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync Snowflake column metadata across all tables in configured schemas.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'POST', path: '/syncs/columns' }],
    models: {
        Column: ColumnSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const checkpointParsed = CheckpointSchema.safeParse(checkpoint);
        const checkpointData = checkpointParsed.success ? checkpointParsed.data : null;
        const isFreshStart =
            checkpointData === null ||
            (checkpointData.database === '' && checkpointData.schema === '' && checkpointData.table === '' && checkpointData.column_name === '');

        if (isFreshStart) {
            await nango.trackDeletesStart('Column');
        }

        async function executeStatement(sql: string): Promise<{ rows: unknown[][]; columns: { name: string }[] }> {
            const postResponse = await nango.post({
                // https://docs.snowflake.com/en/developer-guide/sql-api/index
                endpoint: '/api/v2/statements',
                data: { statement: sql },
                retries: 3
            });

            const postParsed = StatementResponseSchema.safeParse(postResponse.data);
            if (!postParsed.success) {
                throw new Error(`Failed to parse statement submission response: ${postParsed.error.message}`);
            }

            const handle = postParsed.data.statementHandle;
            if (!handle) {
                return {
                    rows: postParsed.data.data ?? [],
                    columns: postParsed.data.resultSetMetaData?.rowType ?? []
                };
            }

            const getResponse = await nango.get({
                // https://docs.snowflake.com/en/developer-guide/sql-api/index
                endpoint: `/api/v2/statements/${encodeURIComponent(handle)}`,
                retries: 3
            });

            const getParsed = StatementResponseSchema.safeParse(getResponse.data);
            if (!getParsed.success) {
                throw new Error(`Failed to parse statement results response: ${getParsed.error.message}`);
            }

            const rows = getParsed.data.data ? [...getParsed.data.data] : [];
            const columns = getParsed.data.resultSetMetaData?.rowType ?? [];
            const numPartitions = getParsed.data.resultSetMetaData?.numPartitions ?? 1;

            for (let i = 1; i < numPartitions; i++) {
                const partitionResponse = await nango.get({
                    // https://docs.snowflake.com/en/developer-guide/sql-api/index
                    endpoint: `/api/v2/statements/${encodeURIComponent(handle)}`,
                    params: { partition: String(i) },
                    retries: 3
                });

                const partitionParsed = StatementResponseSchema.safeParse(partitionResponse.data);
                if (!partitionParsed.success) {
                    throw new Error(`Failed to parse partition response: ${partitionParsed.error.message}`);
                }

                if (partitionParsed.data.data) {
                    for (const row of partitionParsed.data.data) {
                        rows.push(row);
                    }
                }
            }

            return { rows, columns };
        }

        function rowToObject(row: unknown[], columnMeta: { name: string }[]): Record<string, unknown> {
            const obj: Record<string, unknown> = {};
            for (let i = 0; i < columnMeta.length && i < row.length; i++) {
                const meta = columnMeta[i];
                const value = row[i];
                if (meta && value !== undefined) {
                    obj[meta.name] = value;
                }
            }
            return obj;
        }

        function shouldSkipTable(checkpointTable: typeof checkpointData, database: string, schema: string, table: string): boolean {
            if (checkpointTable === null || (checkpointTable.database === '' && checkpointTable.schema === '' && checkpointTable.table === '')) {
                return false;
            }

            const currentKey = `${database}/${schema}/${table}`;
            const checkpointKey = `${checkpointTable.database}/${checkpointTable.schema}/${checkpointTable.table}`;
            return currentKey <= checkpointKey;
        }

        const databasesResult = await executeStatement('SHOW DATABASES');
        const databases = databasesResult.rows
            .map((row) => rowToObject(row, databasesResult.columns))
            .filter((db) => {
                const kind = String(db['kind'] ?? '').toUpperCase();
                return kind !== 'PERSONAL DATABASE';
            });

        for (const dbRow of databases) {
            const dbName = String(dbRow['name'] ?? '');
            if (!dbName) {
                continue;
            }

            const schemasResult = await executeStatement(`SHOW SCHEMAS IN DATABASE ${dbName}`);
            const schemas = schemasResult.rows
                .map((row) => rowToObject(row, schemasResult.columns))
                .filter((schema) => {
                    const name = String(schema['name'] ?? '').toUpperCase();
                    return name !== 'INFORMATION_SCHEMA';
                });

            for (const schemaRow of schemas) {
                const schemaName = String(schemaRow['name'] ?? '');
                if (!schemaName) {
                    continue;
                }

                const tablesResult = await executeStatement(`SHOW TABLES IN SCHEMA ${dbName}.${schemaName}`);
                const tables = tablesResult.rows.map((row) => rowToObject(row, tablesResult.columns));

                for (const tableRow of tables) {
                    const tableName = String(tableRow['name'] ?? '');
                    if (!tableName) {
                        continue;
                    }

                    if (checkpointData !== null && shouldSkipTable(checkpointData, dbName, schemaName, tableName)) {
                        continue;
                    }

                    const columnsResult = await executeStatement(`SHOW COLUMNS IN TABLE ${dbName}.${schemaName}.${tableName}`);
                    const columns = columnsResult.rows.map((row) => rowToObject(row, columnsResult.columns));

                    const columnRecords = [];
                    let lastColumnName = '';

                    for (let i = 0; i < columns.length; i++) {
                        const col = columns[i];
                        if (!col) {
                            continue;
                        }
                        const columnName = String(col['column_name'] ?? '');
                        lastColumnName = columnName;

                        const dataTypeStr = col['data_type'] ? String(col['data_type']) : '';
                        let dataTypeObj: Record<string, unknown> = {};

                        if (dataTypeStr) {
                            const parsedJson = JSON.parse(dataTypeStr);
                            const parsed = DataTypeJsonSchema.safeParse(parsedJson);
                            if (!parsed.success) {
                                throw new Error(
                                    `Invalid data_type JSON for column ${dbName}.${schemaName}.${tableName}.${columnName}: ${parsed.error.message}`
                                );
                            }
                            dataTypeObj = parsed.data;
                        }

                        columnRecords.push({
                            id: `${dbName}.${schemaName}.${tableName}.${columnName}`,
                            database_name: dbName,
                            schema_name: schemaName,
                            table_name: tableName,
                            column_name: columnName,
                            ordinal_position: i + 1,
                            data_type: dataTypeStr || undefined,
                            data_type_type: typeof dataTypeObj['type'] === 'string' ? dataTypeObj['type'] : undefined,
                            data_type_precision: typeof dataTypeObj['precision'] === 'number' ? dataTypeObj['precision'] : undefined,
                            data_type_scale: typeof dataTypeObj['scale'] === 'number' ? dataTypeObj['scale'] : undefined,
                            data_type_byte_length: typeof dataTypeObj['byteLength'] === 'number' ? dataTypeObj['byteLength'] : undefined,
                            data_type_length: typeof dataTypeObj['length'] === 'number' ? dataTypeObj['length'] : undefined,
                            nullable: typeof dataTypeObj['nullable'] === 'boolean' ? dataTypeObj['nullable'] : undefined,
                            default_value: col['default'] ? String(col['default']) : undefined,
                            kind: col['kind'] ? String(col['kind']) : undefined,
                            expression: col['expression'] ? String(col['expression']) : undefined,
                            comment: col['comment'] ? String(col['comment']) : undefined,
                            autoincrement: col['autoincrement'] ? String(col['autoincrement']) : undefined
                        });
                    }

                    if (columnRecords.length > 0) {
                        await nango.batchSave(columnRecords, 'Column');
                    }

                    if (columns.length > 0) {
                        await nango.saveCheckpoint({
                            database: dbName,
                            schema: schemaName,
                            table: tableName,
                            column_name: lastColumnName
                        });
                    }
                }
            }
        }

        await nango.trackDeletesEnd('Column');
        await nango.saveCheckpoint({ database: '', schema: '', table: '', column_name: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
