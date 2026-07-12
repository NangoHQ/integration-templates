import { createSync } from 'nango';
import { z } from 'zod';

const GroupSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    mention_name: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    num_stories: z.number().optional(),
    num_epics: z.number().optional(),
    app_url: z.string().optional(),
    workflow_ids: z.array(z.number()).optional()
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    mention_name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    num_stories: z.number().nullable().optional(),
    num_epics: z.number().nullable().optional(),
    app_url: z.string().nullable().optional(),
    workflow_ids: z.array(z.number()).nullable().optional()
});

const sync = createSync({
    description: 'Sync groups.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/v3/groups returns a flat, unpaginated array with no incremental filter,
        // no deleted-record endpoint, and no resumable cursor or page token.
        await nango.trackDeletesStart('Group');

        // https://developer.shortcut.com/api/rest/v3#list-groups
        const response = await nango.get({
            endpoint: '/api/v3/groups',
            retries: 3
        });

        const rawGroups = response.data;
        if (!Array.isArray(rawGroups)) {
            throw new Error('Expected groups response to be an array');
        }

        const groups = [];
        for (const raw of rawGroups) {
            const parsed = ProviderGroupSchema.safeParse(raw);
            if (!parsed.success) {
                throw new Error(`Failed to parse group: ${parsed.error.message}`);
            }
            const group = parsed.data;
            groups.push({
                id: group.id,
                ...(group.name != null && { name: group.name }),
                ...(group.mention_name != null && { mention_name: group.mention_name }),
                ...(group.description != null && { description: group.description }),
                ...(group.color != null && { color: group.color }),
                ...(group.num_stories != null && { num_stories: group.num_stories }),
                ...(group.num_epics != null && { num_epics: group.num_epics }),
                ...(group.app_url != null && { app_url: group.app_url }),
                ...(group.workflow_ids != null && { workflow_ids: group.workflow_ids })
            });
        }

        if (groups.length > 0) {
            await nango.batchSave(groups, 'Group');
        }

        await nango.trackDeletesEnd('Group');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
