import { createSync } from 'nango';
import { z } from 'zod';

const DatabaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_on: z.string().optional(),
    kind: z.string().optional(),
    owner: z.string().optional(),
    comment: z.string().optional()
});

const CheckpointSchema = z.object({
    sync_type: z.string(),
    created_on: z.string(),
    owner: z.string(),
    name: z.string()
});

const RowTypeSchema = z.object({
    name: z.string(),
    type: z.string().nullish(),
    length: z.number().nullish(),
    precision: z.number().nullish(),
    scale: z.number().nullish(),
    nullable: z.boolean().nullish()
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

const StatementResponseSchema = z.object({
    code: z.string(),
    statementHandle: z.string(),
    sqlState: z.string().optional(),
    message: z.string(),
    createdOn: z.number().optional(),
    statementStatusUrl: z.string().optional(),
    resultSetMetaData: ResultSetMetaDataSchema.optional(),
    data: z.array(z.array(z.unknown())).optional()
});

const sync = createSync({
    description: 'Sync Snowflake database metadata',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Database: DatabaseSchema
    },
    endpoints: [
        {
            path: '/syncs/databases',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointResult.success && checkpointResult.data.sync_type === 'full_scan' ? checkpointResult.data : null;
        const isFreshStart = checkpoint === null;

        if (isFreshStart) {
            await nango.trackDeletesStart('Database');
        }

        // https://docs.snowflake.com/en/developer-guide/sql-api/submitting-requests
        const submitResponse = await nango.post({
            endpoint: '/api/v2/statements',
            data: {
                statement: 'SHOW DATABASES'
            },
            retries: 3
        });

        const submitData = StatementResponseSchema.parse(submitResponse.data);
        const statementHandle = submitData.statementHandle;

        if (!submitData.resultSetMetaData) {
            throw new Error('Missing resultSetMetaData in SQL API response');
        }

        const rowType = submitData.resultSetMetaData.rowType ?? [];
        const columnIndex = new Map<string, number>();
        for (let i = 0; i < rowType.length; i++) {
            const col = rowType[i];
            if (col && col.name) {
                columnIndex.set(col.name.toUpperCase(), i);
            }
        }

        const partitionInfo = submitData.resultSetMetaData.partitionInfo ?? [];
        const totalPartitions = partitionInfo.length > 0 ? partitionInfo.length : 1;

        const allRows: Array<Record<string, unknown>> = [];

        for (let partition = 0; partition < totalPartitions; partition++) {
            let data: unknown[][];

            if (partition === 0) {
                data = submitData.data ?? [];
            } else {
                // https://docs.snowflake.com/en/developer-guide/sql-api/handling-responses
                const partitionResponse = await nango.get({
                    endpoint: `/api/v2/statements/${encodeURIComponent(statementHandle)}`,
                    params: {
                        partition: String(partition)
                    },
                    retries: 3
                });
                const partitionData = StatementResponseSchema.parse(partitionResponse.data);
                data = partitionData.data ?? [];
            }

            for (const row of data) {
                if (!Array.isArray(row)) {
                    throw new Error(`Unexpected row format in partition ${partition}: not an array`);
                }
                const rowMap: Record<string, unknown> = {};
                for (const [colName, idx] of columnIndex) {
                    rowMap[colName] = row[idx];
                }
                allRows.push(rowMap);
            }
        }

        const databases = allRows
            .map((row) => {
                const name = row['NAME'] != null ? String(row['NAME']) : '';
                const kind = row['KIND'] != null ? String(row['KIND']) : undefined;
                const createdOn = row['CREATED_ON'] != null ? String(row['CREATED_ON']) : undefined;
                const owner = row['OWNER'] != null ? String(row['OWNER']) : undefined;
                const comment = row['COMMENT'] != null ? String(row['COMMENT']) : undefined;

                return {
                    id: name,
                    name,
                    ...(createdOn !== undefined && { created_on: createdOn }),
                    ...(kind !== undefined && { kind }),
                    ...(owner !== undefined && { owner }),
                    ...(comment !== undefined && { comment })
                };
            })
            .filter((db) => db.kind !== 'PERSONAL DATABASE' && db.id !== '');

        databases.sort((a, b) => {
            const createdOnA = a.created_on ?? '';
            const createdOnB = b.created_on ?? '';
            const createdOnCmp = createdOnA.localeCompare(createdOnB);
            if (createdOnCmp !== 0) {
                return createdOnCmp;
            }
            const ownerA = a.owner ?? '';
            const ownerB = b.owner ?? '';
            const ownerCmp = ownerA.localeCompare(ownerB);
            if (ownerCmp !== 0) {
                return ownerCmp;
            }
            return a.name.localeCompare(b.name);
        });

        const databasesToSave = checkpoint
            ? databases.filter((db) => {
                  const createdOn = db.created_on ?? '';
                  const owner = db.owner ?? '';

                  if (createdOn > checkpoint.created_on) {
                      return true;
                  }
                  if (createdOn < checkpoint.created_on) {
                      return false;
                  }
                  if (owner > checkpoint.owner) {
                      return true;
                  }
                  if (owner < checkpoint.owner) {
                      return false;
                  }
                  return db.name > checkpoint.name;
              })
            : databases;

        const batchSize = 100;
        for (let i = 0; i < databasesToSave.length; i += batchSize) {
            const batch = databasesToSave.slice(i, i + batchSize);
            if (batch.length === 0) {
                continue;
            }

            await nango.batchSave(batch, 'Database');

            const last = batch[batch.length - 1];
            if (last) {
                await nango.saveCheckpoint({
                    sync_type: 'full_scan',
                    created_on: last.created_on ?? '',
                    owner: last.owner ?? '',
                    name: last.name
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Database');
    }
});

export type NangoSyncLocal = Parameters<typeof sync.exec>[0];
export default sync;
