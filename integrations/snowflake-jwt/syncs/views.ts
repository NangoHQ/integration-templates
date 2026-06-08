import { createSync } from 'nango';
import { z } from 'zod';

const ViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    database_name: z.string(),
    schema_name: z.string(),
    text: z.string().optional(),
    is_secure: z.string().optional(),
    is_materialized: z.string().optional(),
    change_tracking: z.string().optional(),
    owner: z.string().optional(),
    comment: z.string().optional()
});

const CheckpointSchema = z.object({
    sync_type: z.string(),
    database_name: z.string(),
    schema_name: z.string(),
    name: z.string()
});

const MetadataSchema = z.object({
    schemas: z
        .array(
            z.object({
                database: z.string(),
                schema: z.string()
            })
        )
        .optional()
});

const ColumnMetaSchema = z.object({
    name: z.string()
});

const PartitionInfoSchema = z.object({
    rowCount: z.number()
});

const ResultSetMetaDataSchema = z.object({
    numRows: z.number(),
    rowType: z.array(ColumnMetaSchema),
    partitionInfo: z.array(PartitionInfoSchema)
});

const StatementResponseSchema = z.object({
    code: z.string(),
    statementHandle: z.string(),
    resultSetMetaData: ResultSetMetaDataSchema,
    data: z.array(z.array(z.unknown()))
});

const PartitionResponseSchema = z.object({
    data: z.array(z.array(z.unknown()))
});

const DatabaseRowSchema = z.object({
    name: z.string(),
    kind: z.string().optional()
});

const SchemaRowSchema = z.object({
    name: z.string(),
    database_name: z.string().optional()
});

const ViewRowSchema = z.object({
    name: z.string(),
    database_name: z.string(),
    schema_name: z.string(),
    text: z.string().nullable().optional(),
    is_secure: z.string().nullable().optional(),
    is_materialized: z.string().nullable().optional(),
    change_tracking: z.string().nullable().optional(),
    owner: z.string().nullable().optional(),
    comment: z.string().nullable().optional()
});

function compareStrings(a: string, b: string): number {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];

async function executeStatement(nango: NangoSyncLocal, statement: string): Promise<{ columns: string[]; rows: unknown[][] }> {
    // https://docs.snowflake.com/en/developer-guide/sql-api/index
    const postResponse = await nango.post({
        endpoint: '/api/v2/statements',
        data: { statement },
        retries: 3
    });

    const postData = StatementResponseSchema.parse(postResponse.data);
    const handle = postData.statementHandle;
    const columns = postData.resultSetMetaData.rowType.map((col) => col.name);
    const rows: unknown[][] = [...postData.data];

    for (let p = 1; p < postData.resultSetMetaData.partitionInfo.length; p++) {
        // https://docs.snowflake.com/en/developer-guide/sql-api/handling-responses
        const getResponse = await nango.get({
            endpoint: `/api/v2/statements/${encodeURIComponent(handle)}`,
            params: { partition: String(p) },
            retries: 3
        });

        const getData = PartitionResponseSchema.parse(getResponse.data);
        rows.push(...getData.data);
    }

    return { columns, rows };
}

async function getConfiguredSchemas(nango: NangoSyncLocal, metadata: z.infer<typeof MetadataSchema>): Promise<{ database: string; schema: string }[]> {
    if (metadata?.schemas && metadata.schemas.length > 0) {
        return [...metadata.schemas]
            .map((s) => ({ database: s.database, schema: s.schema }))
            .sort((a, b) => {
                const dbCmp = compareStrings(a.database, b.database);
                if (dbCmp !== 0) {
                    return dbCmp;
                }
                return compareStrings(a.schema, b.schema);
            });
    }

    const { columns: dbCols, rows: dbRows } = await executeStatement(nango, 'SHOW DATABASES');
    const databases: string[] = [];
    for (const row of dbRows) {
        if (!Array.isArray(row)) {
            continue;
        }
        const raw: Record<string, unknown> = {};
        for (let i = 0; i < dbCols.length; i++) {
            const colName = dbCols[i];
            if (colName === undefined) {
                continue;
            }
            raw[colName] = row[i];
        }
        const parsed = DatabaseRowSchema.parse(raw);
        if (parsed.kind !== 'PERSONAL DATABASE') {
            databases.push(parsed.name);
        }
    }

    databases.sort(compareStrings);

    const schemas: { database: string; schema: string }[] = [];
    for (const database of databases) {
        const { columns: schemaCols, rows: schemaRows } = await executeStatement(nango, `SHOW SCHEMAS IN DATABASE "${database.replace(/"/g, '""')}"`);
        for (const row of schemaRows) {
            if (!Array.isArray(row)) {
                continue;
            }
            const raw: Record<string, unknown> = {};
            for (let i = 0; i < schemaCols.length; i++) {
                const colName = schemaCols[i];
                if (colName === undefined) {
                    continue;
                }
                raw[colName] = row[i];
            }
            const parsed = SchemaRowSchema.parse(raw);
            if (parsed.name !== 'INFORMATION_SCHEMA') {
                schemas.push({ database: parsed.database_name || database, schema: parsed.name });
            }
        }
    }

    schemas.sort((a, b) => {
        const dbCmp = compareStrings(a.database, b.database);
        if (dbCmp !== 0) {
            return dbCmp;
        }
        return compareStrings(a.schema, b.schema);
    });

    return schemas;
}

const sync = createSync({
    description: 'Sync Snowflake view metadata.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/views' }],
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        View: ViewSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const rawCheckpoint = await nango.getCheckpoint();

        const metadataResult = MetadataSchema.safeParse(metadata ?? undefined);
        if (!metadataResult.success) {
            throw new Error('Invalid metadata');
        }

        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpointData = checkpointResult.success && checkpointResult.data.sync_type === 'full_scan' ? checkpointResult.data : null;
        const isFreshStart = checkpointData === null;

        if (isFreshStart) {
            await nango.trackDeletesStart('View');
        }

        const schemas = await getConfiguredSchemas(nango, metadataResult.data);

        let startIndex = 0;
        let skipName = '';

        if (checkpointData) {
            for (let i = 0; i < schemas.length; i++) {
                const schema = schemas[i];
                if (schema === undefined) {
                    continue;
                }
                if (schema.database === checkpointData.database_name && schema.schema === checkpointData.schema_name) {
                    startIndex = i;
                    skipName = checkpointData.name;
                    break;
                }
            }
        }

        const batchSize = 100;

        for (let i = startIndex; i < schemas.length; i++) {
            const schemaEntry = schemas[i];
            if (schemaEntry === undefined) {
                continue;
            }
            const { database, schema } = schemaEntry;

            if (checkpointData && database === checkpointData.database_name && schema === checkpointData.schema_name && checkpointData.name === '') {
                skipName = '';
                continue;
            }

            const { columns, rows } = await executeStatement(nango, `SHOW VIEWS IN SCHEMA "${database.replace(/"/g, '""')}"."${schema.replace(/"/g, '""')}"`);

            const parsedViews: z.infer<typeof ViewRowSchema>[] = [];
            for (const row of rows) {
                if (!Array.isArray(row)) {
                    continue;
                }
                const raw: Record<string, unknown> = {};
                for (let c = 0; c < columns.length; c++) {
                    const colName = columns[c];
                    if (colName === undefined) {
                        continue;
                    }
                    raw[colName] = row[c];
                }

                parsedViews.push(ViewRowSchema.parse(raw));
            }

            parsedViews.sort((a, b) => compareStrings(a.name, b.name));

            const views: z.infer<typeof ViewSchema>[] = [];
            for (const parsed of parsedViews) {
                if (
                    checkpointData &&
                    skipName &&
                    database === checkpointData.database_name &&
                    schema === checkpointData.schema_name &&
                    parsed.name <= skipName
                ) {
                    continue;
                }

                views.push({
                    id: `${parsed.database_name}.${parsed.schema_name}.${parsed.name}`,
                    name: parsed.name,
                    database_name: parsed.database_name,
                    schema_name: parsed.schema_name,
                    ...(parsed.text != null && { text: parsed.text }),
                    ...(parsed.is_secure != null && { is_secure: parsed.is_secure }),
                    ...(parsed.is_materialized != null && { is_materialized: parsed.is_materialized }),
                    ...(parsed.change_tracking != null && { change_tracking: parsed.change_tracking }),
                    ...(parsed.owner != null && { owner: parsed.owner }),
                    ...(parsed.comment != null && { comment: parsed.comment })
                });
            }

            if (views.length === 0) {
                await nango.saveCheckpoint({
                    sync_type: 'full_scan',
                    database_name: database,
                    schema_name: schema,
                    name: ''
                });
            } else {
                for (let batchIndex = 0; batchIndex < views.length; batchIndex += batchSize) {
                    const batch = views.slice(batchIndex, batchIndex + batchSize);
                    if (batch.length === 0) {
                        continue;
                    }

                    await nango.batchSave(batch, 'View');

                    const lastView = batch[batch.length - 1];
                    if (lastView === undefined) {
                        continue;
                    }

                    await nango.saveCheckpoint({
                        sync_type: 'full_scan',
                        database_name: lastView.database_name,
                        schema_name: lastView.schema_name,
                        name: lastView.name
                    });
                }
            }

            skipName = '';
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('View');
    }
});

export default sync;
