import { createSync } from 'nango';
import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import type { AxiosResponse } from 'axios';

// Provider docs: https://developer.zendesk.com/api-reference/ticketing/users/users/
interface ProviderUser {
    id: number;
    name: string;
    email?: string;
    created_at: string;
    updated_at: string;
    role?: string;
    active?: boolean;
    verified?: boolean;
    organization_id?: number;
    locale?: string;
    time_zone?: string;
    alias?: string;
    details?: string;
    external_id?: string;
    phone?: string;
    user_fields?: Record<string, unknown>;
}

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    role: z.string().optional(),
    active: z.boolean().optional(),
    verified: z.boolean().optional(),
    organization_id: z.string().optional(),
    locale: z.string().optional(),
    time_zone: z.string().optional(),
    alias: z.string().optional(),
    details: z.string().optional(),
    external_id: z.string().optional(),
    phone: z.string().optional()
});

// Cursor-based checkpoint for incremental exports
// Provider docs: https://developer.zendesk.com/documentation/ticketing/managing-tickets/using-the-incremental-export-api/#cursor-based-incremental-exports
const CheckpointSchema = z.object({
    cursor: z.string()
});

interface ZendeskUsersResponse {
    users: ProviderUser[];
    after_cursor?: string;
    end_of_stream?: boolean;
}

const sync = createSync({
    description: 'Sync users from Zendesk Support using incremental cursor-based exports',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/users'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const checkpointCursor = checkpoint?.['cursor'];
        let cursor: string | undefined = typeof checkpointCursor === 'string' && checkpointCursor ? checkpointCursor : undefined;

        // Provider docs: https://developer.zendesk.com/api-reference/ticketing/ticket-management/incremental_exports/#incremental-user-export-cursor-based
        const proxyConfig: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/ticketing/ticket-management/incremental_exports/#incremental-user-export-cursor-based
            endpoint: '/api/v2/incremental/users/cursor',
            params: cursor ? { cursor } : { start_time: 0 },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'after_cursor',
                response_path: 'users',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async (paginationState: { nextPageParam?: string | number | undefined; response: AxiosResponse<ZendeskUsersResponse> }) => {
                    const afterCursor = paginationState.response.data.after_cursor;
                    cursor = afterCursor ?? (typeof paginationState.nextPageParam === 'string' ? paginationState.nextPageParam : undefined);
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<ProviderUser>(proxyConfig)) {
            const users = page
                .filter((user) => user.id !== undefined)
                .map((user) => ({
                    id: String(user.id),
                    name: user.name,
                    ...(user.email !== undefined && user.email !== null && { email: user.email }),
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    ...(user.role !== undefined && user.role !== null && { role: user.role }),
                    ...(user.active !== undefined && { active: user.active }),
                    ...(user.verified !== undefined && { verified: user.verified }),
                    ...(user.organization_id !== undefined &&
                        user.organization_id !== null && {
                            organization_id: String(user.organization_id)
                        }),
                    ...(user.locale !== undefined && user.locale !== null && { locale: user.locale }),
                    ...(user.time_zone !== undefined && user.time_zone !== null && { time_zone: user.time_zone }),
                    ...(user.alias !== undefined && user.alias !== null && { alias: user.alias }),
                    ...(user.details !== undefined && user.details !== null && { details: user.details }),
                    ...(user.external_id !== undefined && user.external_id !== null && { external_id: user.external_id }),
                    ...(user.phone !== undefined && user.phone !== null && { phone: user.phone })
                }));

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
