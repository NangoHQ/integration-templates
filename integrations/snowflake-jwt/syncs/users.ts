import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    login_name: z.string().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    display_name: z.string().optional(),
    default_role: z.string().optional(),
    default_warehouse: z.string().optional(),
    disabled: z.boolean().optional(),
    has_password: z.boolean().optional(),
    has_rsa_public_key: z.boolean().optional(),
    last_success_login: z.string().optional()
});

const CheckpointSchema = z.object({
    sync_type: z.string(),
    created_on: z.string(),
    name: z.string()
});

const StatementResponseSchema = z.object({
    statementHandle: z.string().optional(),
    statementStatusUrl: z.string().optional(),
    resultSetMetaData: z
        .object({
            partitionInfo: z
                .array(
                    z.object({
                        rowCount: z.number(),
                        uncompressedSize: z.number().optional()
                    })
                )
                .optional(),
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
                .optional()
        })
        .optional(),
    data: z.array(z.array(z.unknown())).optional()
});

const PartitionResponseSchema = z.object({
    data: z.array(z.array(z.unknown())).optional()
});

function parseString(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    return undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return undefined;
}

type RawUser = {
    id: string;
    created_on: string;
    login_name: string | undefined;
    email: string | undefined;
    first_name: string | undefined;
    last_name: string | undefined;
    display_name: string | undefined;
    default_role: string | undefined;
    default_warehouse: string | undefined;
    disabled: boolean | undefined;
    has_password: boolean | undefined;
    has_rsa_public_key: boolean | undefined;
    last_success_login: string | undefined;
};

const sync = createSync({
    description: 'Sync Snowflake user roster with login, auth, and role details',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/users'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointResult.success && checkpointResult.data.sync_type === 'full_scan' ? checkpointResult.data : null;
        const isFreshStart = checkpoint === null;

        if (isFreshStart) {
            await nango.trackDeletesStart('User');
        }

        // https://docs.snowflake.com/en/developer-guide/sql-api/index
        const postResponse = await nango.post({
            endpoint: '/api/v2/statements',
            data: {
                statement: 'SHOW USERS',
                resultSetMetaData: {
                    format: 'json'
                }
            },
            retries: 3
        });

        const postParsed = StatementResponseSchema.safeParse(postResponse.data);
        if (!postParsed.success) {
            throw new Error('Failed to parse statement submission response');
        }

        const postData = postParsed.data;
        let handle = postData.statementHandle;
        if (!handle && postData.statementStatusUrl) {
            const parts = postData.statementStatusUrl.split('/');
            const lastPart = parts[parts.length - 1];
            if (lastPart) {
                handle = lastPart.split('?')[0];
            }
        }
        if (!handle) {
            throw new Error('No statement handle returned from SHOW USERS');
        }

        const partitionInfo = postData.resultSetMetaData?.partitionInfo ?? [];
        const rowType = postData.resultSetMetaData?.rowType ?? [];

        const columnIndex: Record<string, number> = {};
        for (let i = 0; i < rowType.length; i++) {
            const col = rowType[i];
            if (col) {
                columnIndex[col.name.toUpperCase()] = i;
            }
        }

        const getValue = (row: unknown[], colName: string): unknown => {
            const idx = columnIndex[colName.toUpperCase()];
            return idx !== undefined ? row[idx] : undefined;
        };

        const allRows: unknown[][] = [];
        if (postData.data) {
            for (const row of postData.data) {
                if (Array.isArray(row)) {
                    allRows.push(row);
                }
            }
        }

        for (let partitionNum = 1; partitionNum < partitionInfo.length; partitionNum++) {
            // https://docs.snowflake.com/en/developer-guide/sql-api/index
            const getResponse = await nango.get({
                endpoint: `/api/v2/statements/${encodeURIComponent(handle)}`,
                params: {
                    partition: partitionNum
                },
                retries: 3
            });

            const getParsed = PartitionResponseSchema.safeParse(getResponse.data);
            if (!getParsed.success) {
                throw new Error(`Failed to parse partition ${partitionNum} response`);
            }

            if (getParsed.data.data) {
                for (const row of getParsed.data.data) {
                    if (Array.isArray(row)) {
                        allRows.push(row);
                    }
                }
            }
        }

        const rawUsers: RawUser[] = [];
        for (const row of allRows) {
            const name = parseString(getValue(row, 'name'));
            const createdOn = parseString(getValue(row, 'created_on'));
            if (!name || !createdOn) {
                continue;
            }

            rawUsers.push({
                id: name,
                created_on: createdOn,
                login_name: parseString(getValue(row, 'login_name')),
                email: parseString(getValue(row, 'email')),
                first_name: parseString(getValue(row, 'first_name')),
                last_name: parseString(getValue(row, 'last_name')),
                display_name: parseString(getValue(row, 'display_name')),
                default_role: parseString(getValue(row, 'default_role')),
                default_warehouse: parseString(getValue(row, 'default_warehouse')),
                disabled: parseBoolean(getValue(row, 'disabled')),
                has_password: parseBoolean(getValue(row, 'has_password')),
                has_rsa_public_key: parseBoolean(getValue(row, 'has_rsa_public_key')),
                last_success_login: parseString(getValue(row, 'last_success_login'))
            });
        }

        rawUsers.sort((a, b) => {
            if (a.created_on < b.created_on) {
                return -1;
            }
            if (a.created_on > b.created_on) {
                return 1;
            }
            if (a.id < b.id) {
                return -1;
            }
            if (a.id > b.id) {
                return 1;
            }
            return 0;
        });

        const rawUsersToSave = checkpoint
            ? rawUsers.filter((user) => {
                  if (user.created_on > checkpoint.created_on) {
                      return true;
                  }
                  if (user.created_on < checkpoint.created_on) {
                      return false;
                  }
                  return user.id > checkpoint.name;
              })
            : rawUsers;

        const batchSize = 100;
        for (let i = 0; i < rawUsersToSave.length; i += batchSize) {
            const rawBatch = rawUsersToSave.slice(i, i + batchSize);
            if (rawBatch.length === 0) {
                continue;
            }

            const users = rawBatch.map((raw) => ({
                id: raw.id,
                ...(raw.login_name !== undefined && { login_name: raw.login_name }),
                ...(raw.email !== undefined && { email: raw.email }),
                ...(raw.first_name !== undefined && { first_name: raw.first_name }),
                ...(raw.last_name !== undefined && { last_name: raw.last_name }),
                ...(raw.display_name !== undefined && { display_name: raw.display_name }),
                ...(raw.default_role !== undefined && { default_role: raw.default_role }),
                ...(raw.default_warehouse !== undefined && { default_warehouse: raw.default_warehouse }),
                ...(raw.disabled !== undefined && { disabled: raw.disabled }),
                ...(raw.has_password !== undefined && { has_password: raw.has_password }),
                ...(raw.has_rsa_public_key !== undefined && { has_rsa_public_key: raw.has_rsa_public_key }),
                ...(raw.last_success_login !== undefined && { last_success_login: raw.last_success_login })
            }));

            await nango.batchSave(users, 'User');

            const lastUser = rawBatch[rawBatch.length - 1];
            if (lastUser) {
                await nango.saveCheckpoint({
                    sync_type: 'full_scan',
                    created_on: lastUser.created_on,
                    name: lastUser.id
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
