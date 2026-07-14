import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderGroupSchema = z.object({
    sys_id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    active: z.string().nullable().optional(),
    sys_updated_on: z.string()
});

const GroupSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
    sys_updated_on: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync groups.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const queryParts: string[] = [];
        if (checkpoint?.updated_after) {
            queryParts.push(`sys_updated_on>${checkpoint.updated_after}`);
        }
        queryParts.push('ORDERBYsys_updated_on');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/TableAPI
            endpoint: '/api/now/table/sys_user_group',
            params: {
                sysparm_query: queryParts.join('^'),
                sysparm_display_value: 'true'
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                response_path: 'result',
                limit_name_in_request: 'sysparm_limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const groups = page.map((record) => {
                const parsed = ProviderGroupSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse provider group: ${parsed.error.message}`);
                }

                const data = parsed.data;
                return {
                    id: data.sys_id,
                    ...(data.name != null && { name: data.name }),
                    ...(data.description != null && { description: data.description }),
                    ...(data.active != null && { active: data.active === 'true' }),
                    sys_updated_on: data.sys_updated_on
                };
            });

            if (groups.length === 0) {
                continue;
            }

            await nango.batchSave(groups, 'Group');

            const lastGroup = groups[groups.length - 1];
            if (lastGroup) {
                await nango.saveCheckpoint({
                    updated_after: lastGroup.sys_updated_on
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
