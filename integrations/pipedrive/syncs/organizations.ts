import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    owner_id: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string(),
    active_flag: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

type PipedriveOwner = {
    id: number;
    name?: string;
    email?: string;
    active_flag?: boolean;
};

type PipedriveOrganization = {
    id: number;
    name?: string | null;
    owner_id?: number | PipedriveOwner;
    add_time?: string;
    update_time: string;
    active_flag?: boolean;
};

const sync = createSync({
    description: 'Sync organizations from Pipedrive.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/organizations' }],
    checkpoint: CheckpointSchema,
    models: {
        Organization: OrganizationSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined = checkpoint?.updated_after || undefined;
        let cursor: string | undefined = checkpoint?.cursor || undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Organizations#getOrganizations
            endpoint: '/v1/organizations',
            params: {
                sort_by: 'update_time',
                sort_direction: 'asc',
                ...(updatedAfter && { updated_since: updatedAfter }),
                ...(cursor && { cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'additional_data.next_cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 500,
                on_page: async (paginationState) => {
                    const { nextPageParam } = paginationState;
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<PipedriveOrganization>(proxyConfig)) {
            const organizations = page.map((record) => {
                // owner_id can be either a number or an object with id property
                let ownerId: number | undefined;
                if (record.owner_id !== undefined) {
                    if (typeof record.owner_id === 'number') {
                        ownerId = record.owner_id;
                    } else if (typeof record.owner_id === 'object' && record.owner_id !== null && 'id' in record.owner_id) {
                        ownerId = record.owner_id.id;
                    }
                }

                return {
                    id: String(record.id),
                    ...(record.name != null && { name: record.name }),
                    ...(ownerId !== undefined && { owner_id: ownerId }),
                    ...(record.add_time !== undefined && { add_time: record.add_time }),
                    update_time: record.update_time,
                    ...(record.active_flag !== undefined && { active_flag: record.active_flag })
                };
            });

            if (organizations.length === 0) {
                continue;
            }

            await nango.batchSave(organizations, 'Organization');

            if (cursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    cursor
                });
                continue;
            }

            const lastOrganization = organizations[organizations.length - 1];
            if (lastOrganization && lastOrganization.update_time) {
                updatedAfter = lastOrganization.update_time;
            }
            await nango.saveCheckpoint({
                updated_after: updatedAfter || '',
                cursor: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
