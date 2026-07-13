import { createSync } from 'nango';
import { z } from 'zod';

const ProviderLabelSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    external_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const IterationStatsSchema = z.object({
    average_cycle_time: z.number().optional(),
    average_lead_time: z.number().optional(),
    num_points: z.number().optional(),
    num_points_backlog: z.number().optional(),
    num_points_done: z.number().optional(),
    num_points_started: z.number().optional(),
    num_points_unstarted: z.number().optional(),
    num_related_documents: z.number().optional(),
    num_stories_backlog: z.number().optional(),
    num_stories_done: z.number().optional(),
    num_stories_started: z.number().optional(),
    num_stories_unestimated: z.number().optional(),
    num_stories_unstarted: z.number().optional()
});

const ProviderIterationSchema = z
    .object({
        id: z.number(),
        app_url: z.string().optional(),
        created_at: z.string(),
        description: z.string().optional(),
        end_date: z.string().optional(),
        entity_type: z.string().optional(),
        follower_ids: z.array(z.string()).optional(),
        group_ids: z.array(z.string()).optional(),
        group_mention_ids: z.array(z.string()).optional(),
        label_ids: z.array(z.number()).optional(),
        labels: z.array(ProviderLabelSchema).optional(),
        member_mention_ids: z.array(z.string()).optional(),
        mention_ids: z.array(z.string()).optional(),
        name: z.string(),
        start_date: z.string().optional(),
        stats: IterationStatsSchema.optional(),
        status: z.string().optional(),
        updated_at: z.string()
    })
    .passthrough();

const IterationSchema = z.object({
    id: z.string(),
    app_url: z.string().optional(),
    created_at: z.string(),
    description: z.string().optional(),
    end_date: z.string().optional(),
    entity_type: z.string().optional(),
    follower_ids: z.array(z.string()).optional(),
    group_ids: z.array(z.string()).optional(),
    group_mention_ids: z.array(z.string()).optional(),
    label_ids: z.array(z.number()).optional(),
    labels: z.array(ProviderLabelSchema).optional(),
    member_mention_ids: z.array(z.string()).optional(),
    mention_ids: z.array(z.string()).optional(),
    name: z.string(),
    start_date: z.string().optional(),
    stats: IterationStatsSchema.optional(),
    status: z.string().optional(),
    updated_at: z.string()
});

const sync = createSync({
    description: 'Sync iterations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Iteration: IterationSchema
    },

    exec: async (nango) => {
        // https://developer.shortcut.com/api/rest/v3#get-iterations
        const response = await nango.get({
            endpoint: '/api/v3/iterations',
            retries: 3
        });

        const parseResult = z.array(ProviderIterationSchema).safeParse(response.data);
        if (!parseResult.success) {
            throw new Error(`Invalid response from Shortcut iterations endpoint: ${parseResult.error.message}`);
        }

        const iterations = parseResult.data.map((iteration) => ({
            id: String(iteration.id),
            ...(iteration.app_url !== undefined && { app_url: iteration.app_url }),
            created_at: iteration.created_at,
            ...(iteration.description !== undefined && { description: iteration.description }),
            ...(iteration.end_date !== undefined && { end_date: iteration.end_date }),
            ...(iteration.entity_type !== undefined && { entity_type: iteration.entity_type }),
            ...(iteration.follower_ids !== undefined && { follower_ids: iteration.follower_ids }),
            ...(iteration.group_ids !== undefined && { group_ids: iteration.group_ids }),
            ...(iteration.group_mention_ids !== undefined && { group_mention_ids: iteration.group_mention_ids }),
            ...(iteration.label_ids !== undefined && { label_ids: iteration.label_ids }),
            ...(iteration.labels !== undefined && { labels: iteration.labels }),
            ...(iteration.member_mention_ids !== undefined && { member_mention_ids: iteration.member_mention_ids }),
            ...(iteration.mention_ids !== undefined && { mention_ids: iteration.mention_ids }),
            name: iteration.name,
            ...(iteration.start_date !== undefined && { start_date: iteration.start_date }),
            ...(iteration.stats !== undefined && { stats: iteration.stats }),
            ...(iteration.status !== undefined && { status: iteration.status }),
            updated_at: iteration.updated_at
        }));

        await nango.trackDeletesStart('Iteration');
        if (iterations.length > 0) {
            await nango.batchSave(iterations, 'Iteration');
        }
        await nango.trackDeletesEnd('Iteration');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
