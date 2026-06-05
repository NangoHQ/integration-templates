import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    schemas: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    sync_type: z.string(),
    database_name: z.string(),
    schema_name: z.string(),
    name: z.string()
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string(),
    database_name: z.string(),
    schema_name: z.string(),
    rows: z.number().nullable().optional(),
    bytes: z.number().nullable().optional(),
    is_external: z.string().optional(),
    is_iceberg: z.string().optional(),
    change_tracking: z.string().optional(),
    owner: z.string().optional()
});

const StatementResponseSchema = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    statementHandle: z.string().optional(),
    statementStatus: z.string().optional(),
    resultSetMetaData: z
        .object({
            numRows: z.number().optional(),
            format: z.string().optional(),
            rowType: z
                .array(
                    z.object({
                        name: z.string(),
                        type: z.string().optional(),
                        scale: z.number().nullable().optional(),
                        precision: z.number().nullable().optional(),
                        length: z.number().nullable().optional(),
                        byteLength: z.number().nullable().optional(),
                        nullable: z.boolean().optional()
                    })
                )
                .optional(),
            partitionInfo: z
                .array(
                    z.object({
                        rowCount: z.number().optional(),
                        uncompressedSize: z.number().optional(),
                        compressedSize: z.number().optional()
                    })
                )
                .optional()
        })
        .optional(),
    data: z.array(z.array(z.unknown())).optional()
});

const ShowDatabaseRowSchema = z.object({
    name: z.string(),
    kind: z.string().optional()
});

const ShowSchemaRowSchema = z.object({
    name: z.string(),
    database_name: z.string().optional(),
    kind: z.string().optional()
});

const ShowTableRowSchema = z.object({
    name: z.string(),
    database_name: z.string().optional(),
    schema_name: z.string().optional(),
    kind: z.string().optional(),
    rows: z.union([z.string(), z.number(), z.null()]).optional(),
    bytes: z.union([z.string(), z.number(), z.null()]).optional(),
    owner: z.string().optional(),
    change_tracking: z.string().optional(),
    is_external: z.string().optional(),
    is_iceberg: z.string().optional()
});

function toRecord(row: unknown[], columnNames: string[]): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < row.length; i++) {
        const name = columnNames[i];
        if (name) {
            obj[name] = row[i] === undefined ? null : row[i];
        }
    }
    return obj;
}

async function executeSql(
    nango: NangoSyncLocal,
    statement: string
): Promise<{ data: unknown[][]; meta: NonNullable<z.infer<typeof StatementResponseSchema>['resultSetMetaData']> }> {
    // https://docs.snowflake.com/en/developer-guide/sql-api/reference
    const postResponse = await nango.post({
        endpoint: '/api/v2/statements',
        data: { statement },
        retries: 3
    });

    const postData = StatementResponseSchema.parse(postResponse.data);
    const handle = postData.statementHandle;

    if (!handle) {
        throw new Error(`Failed to execute statement: ${postData.message || 'unknown error'}`);
    }

    let meta = postData.resultSetMetaData;
    let data = postData.data || [];

    if (!meta) {
        // https://docs.snowflake.com/en/developer-guide/sql-api/reference
        const getResponse = await nango.get({
            endpoint: `/api/v2/statements/${encodeURIComponent(handle)}`,
            retries: 3
        });

        const getData = StatementResponseSchema.parse(getResponse.data);
        meta = getData.resultSetMetaData;
        data = getData.data || [];
    }

    if (!meta) {
        throw new Error(`No result metadata for statement: ${statement}`);
    }

    const partitionCount = meta.partitionInfo?.length ?? 1;
    for (let partition = 1; partition < partitionCount; partition++) {
        // https://docs.snowflake.com/en/developer-guide/sql-api/reference
        const partitionResponse = await nango.get({
            endpoint: `/api/v2/statements/${encodeURIComponent(handle)}?partition=${partition}`,
            retries: 3
        });

        const partitionData = StatementResponseSchema.parse(partitionResponse.data);
        if (partitionData.data) {
            data = data.concat(partitionData.data);
        }
    }

    return { data, meta };
}

const sync = createSync({
    description: 'Sync Snowflake table metadata.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ path: '/syncs/tables', method: 'POST' }],
    models: {
        Table: TableSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointResult.success && checkpointResult.data.sync_type === 'full_scan' ? checkpointResult.data : null;
        const isFreshStart = checkpoint === null;

        if (isFreshStart) {
            await nango.trackDeletesStart('Table');
        }

        const schemasToQuery: Array<{ database: string; schema: string }> = [];

        const configuredSchemas = metadata?.schemas;
        if (configuredSchemas && configuredSchemas.length > 0) {
            for (const s of configuredSchemas) {
                const parts = s.split('.');
                if (parts.length >= 2) {
                    const db = parts[0];
                    const sch = parts[1];
                    if (db && sch) {
                        schemasToQuery.push({ database: db, schema: sch });
                    }
                }
            }
        } else {
            // https://docs.snowflake.com/sql-reference/sql/show-databases
            const dbResult = await executeSql(nango, 'SHOW DATABASES');
            const dbColumnNames = dbResult.meta.rowType?.map((c) => c.name) || [];

            const databases = dbResult.data
                .map((row) => ShowDatabaseRowSchema.parse(toRecord(row, dbColumnNames)))
                .filter((db) => db.kind !== 'PERSONAL DATABASE');

            for (const db of databases) {
                // https://docs.snowflake.com/sql-reference/sql/show-schemas
                const schemaResult = await executeSql(nango, `SHOW SCHEMAS IN DATABASE ${db.name}`);
                const schemaColumnNames = schemaResult.meta.rowType?.map((c) => c.name) || [];

                const schemas = schemaResult.data
                    .map((row) => ShowSchemaRowSchema.parse(toRecord(row, schemaColumnNames)))
                    .filter((s) => s.name !== 'INFORMATION_SCHEMA');

                for (const schema of schemas) {
                    schemasToQuery.push({ database: db.name, schema: schema.name });
                }
            }
        }

        schemasToQuery.sort((a, b) => {
            const dbCompare = a.database.localeCompare(b.database);
            if (dbCompare !== 0) {
                return dbCompare;
            }
            return a.schema.localeCompare(b.schema);
        });

        const batchSize = 100;

        for (const { database, schema } of schemasToQuery) {
            if (checkpoint && checkpoint.database_name && database < checkpoint.database_name) {
                continue;
            }
            if (checkpoint && checkpoint.database_name === database && checkpoint.schema_name && schema < checkpoint.schema_name) {
                continue;
            }
            if (checkpoint && checkpoint.database_name === database && checkpoint.schema_name === schema && checkpoint.name === '') {
                continue;
            }

            // https://docs.snowflake.com/sql-reference/sql/show-tables
            const tableResult = await executeSql(nango, `SHOW TABLES IN SCHEMA ${database}.${schema}`);
            const tableColumnNames = tableResult.meta.rowType?.map((c) => c.name) || [];

            const parsedTables = tableResult.data
                .map((row) => ShowTableRowSchema.parse(toRecord(row, tableColumnNames)))
                .sort((a, b) => a.name.localeCompare(b.name));

            const tables: Array<z.infer<typeof TableSchema>> = [];
            for (const parsed of parsedTables) {
                if (
                    checkpoint &&
                    checkpoint.database_name === database &&
                    checkpoint.schema_name === schema &&
                    checkpoint.name &&
                    parsed.name <= checkpoint.name
                ) {
                    continue;
                }

                tables.push({
                    id: `${database}/${schema}/${parsed.name}`,
                    name: parsed.name,
                    database_name: parsed.database_name || database,
                    schema_name: parsed.schema_name || schema,
                    rows: parsed.rows != null ? Number(parsed.rows) : null,
                    bytes: parsed.bytes != null ? Number(parsed.bytes) : null,
                    is_external: parsed.is_external || undefined,
                    is_iceberg: parsed.is_iceberg || undefined,
                    change_tracking: parsed.change_tracking || undefined,
                    owner: parsed.owner || undefined
                });
            }

            if (tables.length === 0) {
                await nango.saveCheckpoint({
                    sync_type: 'full_scan',
                    database_name: database,
                    schema_name: schema,
                    name: ''
                });
                continue;
            }

            for (let i = 0; i < tables.length; i += batchSize) {
                const batch = tables.slice(i, i + batchSize);
                if (batch.length === 0) {
                    continue;
                }

                await nango.batchSave(batch, 'Table');

                const lastTable = batch[batch.length - 1];
                if (!lastTable) {
                    continue;
                }

                await nango.saveCheckpoint({
                    sync_type: 'full_scan',
                    database_name: lastTable.database_name,
                    schema_name: lastTable.schema_name,
                    name: lastTable.name
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Table');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
