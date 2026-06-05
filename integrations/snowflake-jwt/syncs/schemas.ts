import { createSync } from 'nango';
import { z } from 'zod';

const SqlRowTypeSchema = z.object({
    name: z.string(),
    type: z.string().optional(),
    scale: z.number().nullable().optional(),
    precision: z.number().nullable().optional(),
    byteLength: z.number().nullable().optional(),
    length: z.number().nullable().optional(),
    nullable: z.boolean().optional()
});

const SqlApiResponseSchema = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    data: z.array(z.array(z.unknown())).optional(),
    resultSetMetaData: z
        .object({
            rowType: z.array(SqlRowTypeSchema).optional()
        })
        .optional()
});

const SchemaSchema = z.object({
    id: z.string().describe('Composite identifier: database_name/schema_name'),
    database_name: z.string(),
    name: z.string(),
    created_on: z.string().optional(),
    schema_owner: z.string().optional(),
    comment: z.string().optional(),
    retention_time: z.string().optional()
});

const CheckpointSchema = z.object({
    sync_type: z.string(),
    database_name: z.string(),
    name: z.string()
});

function parseSqlRows(response: unknown): Array<Record<string, unknown>> {
    const parsed = SqlApiResponseSchema.parse(response);
    if (!parsed.data || parsed.data.length === 0) {
        return [];
    }

    const rowType = parsed.resultSetMetaData?.rowType;
    if (!rowType || rowType.length === 0) {
        return [];
    }

    const columns = rowType.map((col) => col.name);

    return parsed.data.map((row) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < columns.length; i++) {
            const colName = columns[i];
            if (colName === undefined) {
                continue;
            }
            obj[colName] = row[i];
        }
        return obj;
    });
}

function getStringValue(row: Record<string, unknown>, key: string): string {
    const value = row[key];
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return '';
}

const sync = createSync({
    description: 'Sync Snowflake schema metadata',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/schemas' }],
    models: {
        Schema: SchemaSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointResult.success && checkpointResult.data.sync_type === 'full_scan' ? checkpointResult.data : null;
        const isFreshStart = checkpoint === null;

        if (isFreshStart) {
            await nango.trackDeletesStart('Schema');
        }

        // https://docs.snowflake.com/en/developer-guide/sql-api/index
        const databasesResponse = await nango.post({
            endpoint: '/api/v2/statements',
            data: {
                statement: 'SHOW DATABASES'
            },
            retries: 3
        });

        const databasesRows = parseSqlRows(databasesResponse.data);
        const databaseNames = databasesRows
            .filter((row) => {
                const kind = getStringValue(row, 'kind');
                return kind !== 'PERSONAL DATABASE';
            })
            .map((row) => getStringValue(row, 'name'))
            .filter((name) => name.length > 0)
            .sort((a, b) => a.localeCompare(b));

        const batchSize = 100;

        for (const databaseName of databaseNames) {
            if (checkpoint) {
                if (databaseName < checkpoint.database_name) {
                    continue;
                }

                if (databaseName === checkpoint.database_name && checkpoint.name === '') {
                    continue;
                }
            }

            // https://docs.snowflake.com/en/developer-guide/sql-api/index
            const schemasResponse = await nango.post({
                endpoint: '/api/v2/statements',
                data: {
                    statement: `SHOW SCHEMAS IN DATABASE "${databaseName.replace(/"/g, '""')}"`
                },
                retries: 3
            });

            const schemasRows = parseSqlRows(schemasResponse.data);
            const schemas = schemasRows
                .filter((row) => {
                    const name = getStringValue(row, 'name');
                    return name !== 'INFORMATION_SCHEMA';
                })
                .map((row) => {
                    const dbName = getStringValue(row, 'database_name');
                    const schemaName = getStringValue(row, 'name');
                    return {
                        id: `${dbName}/${schemaName}`,
                        database_name: dbName,
                        name: schemaName,
                        ...(getStringValue(row, 'created_on').length > 0 && { created_on: getStringValue(row, 'created_on') }),
                        ...(getStringValue(row, 'owner').length > 0 && { schema_owner: getStringValue(row, 'owner') }),
                        ...(getStringValue(row, 'comment').length > 0 && { comment: getStringValue(row, 'comment') }),
                        ...(getStringValue(row, 'retention_time').length > 0 && { retention_time: getStringValue(row, 'retention_time') })
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            const schemasToSave =
                checkpoint && databaseName === checkpoint.database_name && checkpoint.name !== ''
                    ? schemas.filter((schema) => schema.name > checkpoint.name)
                    : schemas;

            if (schemasToSave.length === 0) {
                await nango.saveCheckpoint({
                    sync_type: 'full_scan',
                    database_name: databaseName,
                    name: ''
                });
                continue;
            }

            for (let i = 0; i < schemasToSave.length; i += batchSize) {
                const batch = schemasToSave.slice(i, i + batchSize);
                if (batch.length === 0) {
                    continue;
                }

                await nango.batchSave(batch, 'Schema');

                const lastSchema = batch[batch.length - 1];
                if (!lastSchema) {
                    continue;
                }

                await nango.saveCheckpoint({
                    sync_type: 'full_scan',
                    database_name: lastSchema.database_name,
                    name: lastSchema.name
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Schema');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
