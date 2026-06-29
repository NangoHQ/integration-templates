import { createSync } from 'nango';
import { z } from 'zod';

const UserGroupSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const ProviderUserGroupSchema = z.object({
    id: z.string(),
    name: z.string().nullable()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        user_groups: z.array(ProviderUserGroupSchema)
    })
});

const sync = createSync({
    description: 'Full-refresh sync of user groups.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        UserGroup: UserGroupSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('UserGroup');

        // https://docs.fireflies.ai/graphql-api/query/user-groups
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: 'query { user_groups { id name } }'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error('Invalid user_groups response: ' + parsed.error.message);
        }

        const groups = parsed.data.data.user_groups.map((group) => ({
            id: group.id,
            ...(group.name != null && { name: group.name })
        }));

        if (groups.length > 0) {
            await nango.batchSave(groups, 'UserGroup');
        }

        await nango.trackDeletesEnd('UserGroup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
