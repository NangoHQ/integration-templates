import { createSync } from 'nango';
import { z } from 'zod';

const RoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    is_default: z.boolean().optional(),
    is_current: z.boolean().optional(),
    is_inherited: z.boolean().optional(),
    assigned_to_users: z.number().int().optional(),
    granted_to_roles: z.number().int().optional(),
    granted_roles: z.number().int().optional(),
    created_on: z.string(),
    owner: z.string().optional(),
    comment: z.string().optional()
});

const CheckpointSchema = z.object({
    sync_type: z.string(),
    created_on: z.string(),
    name: z.string()
});

const RowTypeSchema = z.object({
    name: z.string(),
    type: z.string(),
    length: z.number().nullable().optional(),
    precision: z.number().nullable().optional(),
    scale: z.number().nullable().optional(),
    nullable: z.boolean().optional()
});

const PartitionInfoSchema = z.object({
    rowCount: z.number(),
    uncompressedSize: z.number().optional(),
    compressedSize: z.number().optional()
});

const ResultSetMetaDataSchema = z.object({
    numRows: z.number().optional(),
    format: z.string().optional(),
    rowType: z.array(RowTypeSchema),
    partitionInfo: z.array(PartitionInfoSchema).optional()
});

const StatementResponseSchema = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    statementHandle: z.string().optional(),
    statementStatusUrl: z.string().optional(),
    sqlState: z.string().optional(),
    createdOn: z.number().optional(),
    resultSetMetaData: ResultSetMetaDataSchema.optional(),
    data: z.array(z.array(z.unknown())).optional()
});

const sync = createSync({
    description: 'Sync Snowflake role metadata and hierarchy.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Role: RoleSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/roles'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointResult.success && checkpointResult.data.sync_type === 'full_scan' ? checkpointResult.data : null;
        const isFreshStart = checkpoint === null;

        if (isFreshStart) {
            await nango.trackDeletesStart('Role');
        }

        // https://docs.snowflake.com/en/developer-guide/sql-api/submitting-requests
        const submitResponse = await nango.post({
            endpoint: '/api/v2/statements',
            data: {
                statement: 'SHOW ROLES'
            },
            retries: 3
        });

        let statementResult = StatementResponseSchema.parse(submitResponse.data);
        const handle = statementResult.statementHandle;

        if (!handle) {
            throw new Error('Missing statementHandle in SQL API response');
        }

        if (!statementResult.data || !statementResult.resultSetMetaData) {
            const maxPollAttempts = 10;
            for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // https://docs.snowflake.com/en/developer-guide/sql-api/handling-responses
                const pollResponse = await nango.get({
                    endpoint: `/api/v2/statements/${encodeURIComponent(handle)}`,
                    retries: 3
                });

                const pollData = StatementResponseSchema.parse(pollResponse.data);
                if (pollData.data && pollData.resultSetMetaData) {
                    statementResult = pollData;
                    break;
                }
            }

            if (!statementResult.data || !statementResult.resultSetMetaData) {
                throw new Error('Statement did not complete within polling timeout');
            }
        }

        const rowType = statementResult.resultSetMetaData.rowType;
        const columnNames = rowType.map((col) => col.name);

        const nameIndex = columnNames.indexOf('name');
        const createdOnIndex = columnNames.indexOf('created_on');
        const isDefaultIndex = columnNames.indexOf('is_default');
        const isCurrentIndex = columnNames.indexOf('is_current');
        const isInheritedIndex = columnNames.indexOf('is_inherited');
        const assignedToUsersIndex = columnNames.indexOf('assigned_to_users');
        const grantedToRolesIndex = columnNames.indexOf('granted_to_roles');
        const grantedRolesIndex = columnNames.indexOf('granted_roles');
        const ownerIndex = columnNames.indexOf('owner');
        const commentIndex = columnNames.indexOf('comment');

        if (nameIndex === -1 || createdOnIndex === -1) {
            throw new Error('Missing required columns in SHOW ROLES result');
        }

        let allRows = statementResult.data;

        const partitionInfo = statementResult.resultSetMetaData.partitionInfo;
        if (partitionInfo && partitionInfo.length > 1) {
            for (let i = 1; i < partitionInfo.length; i++) {
                // https://docs.snowflake.com/en/developer-guide/sql-api/handling-responses
                const partitionResponse = await nango.get({
                    endpoint: `/api/v2/statements/${encodeURIComponent(handle)}`,
                    params: { partition: String(i) },
                    retries: 3
                });

                let partitionData: unknown[];
                if (Array.isArray(partitionResponse.data)) {
                    partitionData = partitionResponse.data;
                } else {
                    const parsed = StatementResponseSchema.parse(partitionResponse.data);
                    partitionData = parsed.data ?? [];
                }

                const rows = z.array(z.array(z.unknown())).parse(partitionData);
                allRows = [...allRows, ...rows];
            }
        }

        const roles: z.infer<typeof RoleSchema>[] = [];

        for (const row of allRows) {
            const name = row[nameIndex];
            const createdOn = row[createdOnIndex];

            if (typeof name !== 'string' || typeof createdOn !== 'string') {
                throw new Error('Invalid row data: name or created_on is not a string');
            }

            const role: Record<string, unknown> = {
                id: name,
                name: name,
                created_on: createdOn
            };

            if (isDefaultIndex !== -1) {
                const val = row[isDefaultIndex];
                if (val === 'Y' || val === 'y' || val === true) {
                    role['is_default'] = true;
                } else if (val === 'N' || val === 'n' || val === false) {
                    role['is_default'] = false;
                }
            }

            if (isCurrentIndex !== -1) {
                const val = row[isCurrentIndex];
                if (val === 'Y' || val === 'y' || val === true) {
                    role['is_current'] = true;
                } else if (val === 'N' || val === 'n' || val === false) {
                    role['is_current'] = false;
                }
            }

            if (isInheritedIndex !== -1) {
                const val = row[isInheritedIndex];
                if (val === 'Y' || val === 'y' || val === true) {
                    role['is_inherited'] = true;
                } else if (val === 'N' || val === 'n' || val === false) {
                    role['is_inherited'] = false;
                }
            }

            if (assignedToUsersIndex !== -1) {
                const val = row[assignedToUsersIndex];
                if (val !== null && val !== undefined) {
                    const num = Number(val);
                    if (!Number.isNaN(num)) {
                        role['assigned_to_users'] = num;
                    }
                }
            }

            if (grantedToRolesIndex !== -1) {
                const val = row[grantedToRolesIndex];
                if (val !== null && val !== undefined) {
                    const num = Number(val);
                    if (!Number.isNaN(num)) {
                        role['granted_to_roles'] = num;
                    }
                }
            }

            if (grantedRolesIndex !== -1) {
                const val = row[grantedRolesIndex];
                if (val !== null && val !== undefined) {
                    const num = Number(val);
                    if (!Number.isNaN(num)) {
                        role['granted_roles'] = num;
                    }
                }
            }

            if (ownerIndex !== -1) {
                const val = row[ownerIndex];
                if (val !== null && val !== undefined && val !== '') {
                    role['owner'] = String(val);
                }
            }

            if (commentIndex !== -1) {
                const val = row[commentIndex];
                if (val !== null && val !== undefined && val !== '') {
                    role['comment'] = String(val);
                }
            }

            roles.push(RoleSchema.parse(role));
        }

        roles.sort((a, b) => {
            if (a.created_on !== b.created_on) {
                return a.created_on.localeCompare(b.created_on);
            }
            return a.name.localeCompare(b.name);
        });

        let filteredRoles = roles;
        if (checkpoint) {
            filteredRoles = roles.filter((role) => {
                if (role.created_on > checkpoint.created_on) {
                    return true;
                }
                if (role.created_on === checkpoint.created_on && role.name > checkpoint.name) {
                    return true;
                }
                return false;
            });
        }

        const batchSize = 100;
        for (let i = 0; i < filteredRoles.length; i += batchSize) {
            const batch = filteredRoles.slice(i, i + batchSize);
            if (batch.length === 0) {
                continue;
            }
            await nango.batchSave(batch, 'Role');
            const last = batch[batch.length - 1];
            if (!last) {
                continue;
            }
            await nango.saveCheckpoint({
                sync_type: 'full_scan',
                created_on: last.created_on,
                name: last.name
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Role');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
