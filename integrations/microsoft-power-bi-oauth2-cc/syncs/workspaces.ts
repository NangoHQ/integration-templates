import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 100;

const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    isReadOnly: z.boolean().optional(),
    isOnDedicatedCapacity: z.boolean().optional(),
    capacityId: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional()
});

const ProviderWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    type: z.string().nullish(),
    isReadOnly: z.boolean().nullish(),
    isOnDedicatedCapacity: z.boolean().nullish(),
    capacityId: z.string().nullish(),
    description: z.string().nullish(),
    state: z.string().nullish()
});

const CheckpointSchema = z.object({
    nextOffset: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync Power BI workspaces (groups) accessible to this service principal.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Workspace: WorkspaceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;
        let nextOffset = checkpoint?.nextOffset ?? 0;

        // Full refresh: Power BI groups has no changed-since filter, but $skip/$top lets us resume an interrupted scan.
        await nango.trackDeletesStart('Workspace');

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-groups
            endpoint: '/v1.0/myorg/groups',
            params: {
                $top: PAGE_SIZE
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: nextOffset,
                limit_name_in_request: '$top',
                limit: PAGE_SIZE,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(config)) {
            const workspaces = page.map((raw) => {
                const parsed = ProviderWorkspaceSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Invalid workspace record: ${parsed.error.message}`);
                }
                const record = parsed.data;
                return {
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.type != null && { type: record.type }),
                    ...(record.isReadOnly != null && { isReadOnly: record.isReadOnly }),
                    ...(record.isOnDedicatedCapacity != null && { isOnDedicatedCapacity: record.isOnDedicatedCapacity }),
                    ...(record.capacityId != null && { capacityId: record.capacityId }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.state != null && { state: record.state })
                };
            });

            if (workspaces.length > 0) {
                await nango.batchSave(workspaces, 'Workspace');
            }

            nextOffset += workspaces.length;
            await nango.saveCheckpoint({ nextOffset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Workspace');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
