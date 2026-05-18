import { createSync } from 'nango';
import { z } from 'zod';

const SpaceSchema = z.object({
    id: z.string(),
    state: z.enum(['live', 'scheduled', 'ended']),
    title: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    creator_id: z.string().optional(),
    host_ids: z.array(z.string()).optional(),
    speaker_ids: z.array(z.string()).optional(),
    invited_user_ids: z.array(z.string()).optional(),
    participant_count: z.number().optional(),
    subscriber_count: z.number().optional(),
    is_ticketed: z.boolean().optional(),
    lang: z.string().optional(),
    scheduled_start: z.string().optional(),
    started_at: z.string().optional(),
    ended_at: z.string().optional()
});

const ProviderSpaceSchema = z.object({
    id: z.string(),
    state: z.enum(['live', 'scheduled', 'ended']),
    title: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    creator_id: z.string().nullish(),
    host_ids: z.array(z.string()).nullish(),
    speaker_ids: z.array(z.string()).nullish(),
    invited_user_ids: z.array(z.string()).nullish(),
    participant_count: z.number().nullish(),
    subscriber_count: z.number().nullish(),
    is_ticketed: z.boolean().nullish(),
    lang: z.string().nullish(),
    scheduled_start: z.string().nullish(),
    started_at: z.string().nullish(),
    ended_at: z.string().nullish()
});

type Space = z.infer<typeof SpaceSchema>;

const sync = createSync({
    description: 'Sync spaces from Twitter/X using the search endpoint',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/spaces'
        }
    ],
    models: {
        Space: SpaceSchema
    },

    exec: async (nango) => {
        // The X API /2/spaces/search endpoint is a keyword search snapshot:
        // - no updated_after or modified_since filtering
        // - no pagination cursor in the response
        // - no list-all-spaces endpoint; a query is always required
        // That means there is no safe incremental checkpoint or complete
        // collection scan, so this sync must stay as best-effort upserts only.

        // https://docs.x.com/x-api/spaces/search
        const proxyConfig = {
            endpoint: '/2/spaces/search',
            params: {
                query: 'a',
                state: 'all',
                max_results: 100,
                'space.fields':
                    'created_at,creator_id,ended_at,host_ids,id,invited_user_ids,is_ticketed,lang,participant_count,scheduled_start,speaker_ids,started_at,state,subscriber_count,title,updated_at'
            },
            retries: 3
        };

        const response = await nango.get(proxyConfig);

        if (response.data && Array.isArray(response.data.data)) {
            const spaces: Space[] = response.data.data
                .map((record: unknown) => {
                    const parsed = ProviderSpaceSchema.safeParse(record);
                    if (!parsed.success) {
                        return null;
                    }
                    const space = parsed.data;
                    return {
                        id: space.id,
                        state: space.state,
                        ...(space.title != null && { title: space.title }),
                        ...(space.created_at != null && { created_at: space.created_at }),
                        ...(space.updated_at != null && { updated_at: space.updated_at }),
                        ...(space.creator_id != null && { creator_id: space.creator_id }),
                        ...(space.host_ids != null && { host_ids: space.host_ids }),
                        ...(space.speaker_ids != null && { speaker_ids: space.speaker_ids }),
                        ...(space.invited_user_ids != null && { invited_user_ids: space.invited_user_ids }),
                        ...(space.participant_count != null && { participant_count: space.participant_count }),
                        ...(space.subscriber_count != null && { subscriber_count: space.subscriber_count }),
                        ...(space.is_ticketed != null && { is_ticketed: space.is_ticketed }),
                        ...(space.lang != null && { lang: space.lang }),
                        ...(space.scheduled_start != null && { scheduled_start: space.scheduled_start }),
                        ...(space.started_at != null && { started_at: space.started_at }),
                        ...(space.ended_at != null && { ended_at: space.ended_at })
                    };
                })
                .filter((space: Space | null): space is Space => space !== null);

            if (spaces.length > 0) {
                await nango.batchSave(spaces, 'Space');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
