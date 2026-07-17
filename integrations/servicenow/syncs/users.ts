import { createSync } from 'nango';
import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';

const ProviderUserSchema = z.object({
    sys_id: z.string(),
    user_name: z.string(),
    name: z.string().optional().nullable(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    active: z.union([z.boolean(), z.string()]).optional().nullable(),
    sys_updated_on: z.string(),
    sys_created_on: z.string().optional().nullable()
});

const UserSchema = z.object({
    id: z.string(),
    user_name: z.string(),
    name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    active: z.union([z.boolean(), z.string()]).optional(),
    sys_updated_on: z.string(),
    sys_created_on: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync users.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;
        const queryParts = ['ORDERBYsys_updated_on'];
        if (updatedAfter) {
            queryParts.unshift(`sys_updated_on>=${updatedAfter}`);
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table
            endpoint: '/api/now/table/sys_user',
            params: {
                sysparm_fields: 'sys_id,user_name,name,first_name,last_name,email,active,sys_updated_on,sys_created_on',
                sysparm_query: queryParts.join('^')
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'sysparm_limit',
                limit: 100,
                response_path: 'result'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawUsers = z.array(ProviderUserSchema).safeParse(page);
            if (!rawUsers.success) {
                throw new Error(`Failed to parse users: ${rawUsers.error.message}`);
            }

            const users = rawUsers.data.map((record) => ({
                id: record.sys_id,
                user_name: record.user_name,
                ...(record.name != null && { name: record.name }),
                ...(record.first_name != null && { first_name: record.first_name }),
                ...(record.last_name != null && { last_name: record.last_name }),
                ...(record.email != null && { email: record.email }),
                ...(record.active != null && { active: record.active }),
                sys_updated_on: record.sys_updated_on,
                ...(record.sys_created_on != null && { sys_created_on: record.sys_created_on })
            }));

            if (users.length === 0) {
                continue;
            }

            await nango.batchSave(users, 'User');

            const lastUpdatedOn = rawUsers.data[rawUsers.data.length - 1]?.sys_updated_on;
            if (lastUpdatedOn) {
                await nango.saveCheckpoint({ updated_after: lastUpdatedOn });
            }
        }
    }
});

export default sync;
