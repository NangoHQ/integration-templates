import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawDepartmentSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    externalName: z.string().nullable(),
    isArchived: z.boolean().nullable(),
    parentId: z.string().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable()
});

const PageResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(z.unknown()),
    moreDataAvailable: z.boolean(),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

const DepartmentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    externalName: z.string().optional(),
    isArchived: z.boolean().optional(),
    parentId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    syncToken: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync departments from Ashby',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/departments' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Department: DepartmentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let syncToken = checkpoint?.syncToken || '';
        let cursor = checkpoint?.cursor || '';

        const proxyConfig: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/departmentlist
            endpoint: '/department.list',
            method: 'POST',
            data: {
                limit: 100,
                includeArchived: true,
                ...(syncToken !== '' && { syncToken }),
                ...(cursor !== '' && { cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'nextCursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    const parsed = PageResponseSchema.safeParse(response.data);
                    if (parsed.success && parsed.data.syncToken !== undefined) {
                        syncToken = parsed.data.syncToken;
                    }
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        // @allowTryCatch Ashby returns incremental_sync_too_large and sync_token_expired errors
        // that require clearing the checkpoint and restarting with a full sync.
        try {
            for await (const page of nango.paginate<unknown>(proxyConfig)) {
                const departments: z.infer<typeof DepartmentSchema>[] = [];
                for (const raw of page) {
                    const parsed = RawDepartmentSchema.safeParse(raw);
                    if (!parsed.success) {
                        continue;
                    }
                    const record = parsed.data;
                    departments.push({
                        id: record.id,
                        ...(record.name != null && { name: record.name }),
                        ...(record.externalName != null && { externalName: record.externalName }),
                        ...(record.isArchived != null && { isArchived: record.isArchived }),
                        ...(record.parentId != null && { parentId: record.parentId }),
                        ...(record.createdAt != null && { createdAt: record.createdAt }),
                        ...(record.updatedAt != null && { updatedAt: record.updatedAt })
                    });
                }

                if (departments.length > 0) {
                    await nango.batchSave(departments, 'Department');
                }

                await nango.saveCheckpoint({
                    syncToken: syncToken || '',
                    cursor: cursor || ''
                });
            }
        } catch (error) {
            if (error instanceof Error) {
                const message = error.message.toLowerCase();
                if (message.includes('incremental_sync_too_large') || message.includes('sync_token_expired')) {
                    await nango.saveCheckpoint({ syncToken: '', cursor: '' });
                    throw new Error('Sync token error; restarting with full sync on next run.');
                }
            }
            throw error;
        }

        await nango.saveCheckpoint({
            syncToken: syncToken || '',
            cursor: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
