import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderChangeTaskSchema = z.object({
    sys_id: z.string(),
    number: z.string().nullish(),
    short_description: z.string().nullish(),
    description: z.string().nullish(),
    state: z.string().nullish(),
    priority: z.string().nullish(),
    urgency: z.string().nullish(),
    impact: z.string().nullish(),
    sys_updated_on: z.string().nullish(),
    sys_created_on: z.string().nullish(),
    active: z.string().nullish()
});

const ChangeTaskSchema = z.object({
    id: z.string(),
    number: z.string().optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    priority: z.string().optional(),
    urgency: z.string().optional(),
    impact: z.string().optional(),
    sys_updated_on: z.string().optional(),
    sys_created_on: z.string().optional(),
    active: z.string().optional()
});

const sync = createSync({
    description: 'Sync change tasks',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: z.object({
        updated_after: z.string()
    }),
    models: {
        ChangeTask: ChangeTaskSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const queryParts = ['ORDERBYsys_updated_on'];
        if (updatedAfter) {
            queryParts.unshift(`sys_updated_on>${updatedAfter}`);
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/change_task
            endpoint: '/api/now/table/change_task',
            params: {
                sysparm_query: queryParts.join('^')
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
            const records = z.array(ProviderChangeTaskSchema).parse(page);

            const tasks = records.map((record) => ({
                id: record.sys_id,
                ...(record.number != null && { number: record.number }),
                ...(record.short_description != null && { short_description: record.short_description }),
                ...(record.description != null && { description: record.description }),
                ...(record.state != null && { state: record.state }),
                ...(record.priority != null && { priority: record.priority }),
                ...(record.urgency != null && { urgency: record.urgency }),
                ...(record.impact != null && { impact: record.impact }),
                ...(record.sys_updated_on != null && { sys_updated_on: record.sys_updated_on }),
                ...(record.sys_created_on != null && { sys_created_on: record.sys_created_on }),
                ...(record.active != null && { active: record.active })
            }));

            if (tasks.length > 0) {
                await nango.batchSave(tasks, 'ChangeTask');

                const lastUpdatedOn = tasks[tasks.length - 1]?.sys_updated_on;
                if (lastUpdatedOn) {
                    await nango.saveCheckpoint({
                        updated_after: lastUpdatedOn
                    });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
