import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GongScorecardSchema = z.object({
    scorecardId: z.string(),
    scorecardName: z.string(),
    workspaceId: z.string().nullable().optional(),
    enabled: z.boolean(),
    updaterUserId: z.string(),
    created: z.string(),
    updated: z.string(),
    reviewMethod: z.string().nullable().optional(),
    questions: z.array(z.record(z.string(), z.unknown())).optional()
});

const ScorecardSchema = z.object({
    id: z.string(),
    scorecardId: z.string(),
    scorecardName: z.string(),
    workspaceId: z.string().optional(),
    enabled: z.boolean(),
    updaterUserId: z.string(),
    created: z.string(),
    updated: z.string(),
    reviewMethod: z.string().optional(),
    questions: z.array(z.record(z.string(), z.unknown())).optional()
});

const sync = createSync({
    description: 'Sync scorecards from Gong',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Scorecard: ScorecardSchema
    },
    endpoints: [
        {
            path: '/syncs/scorecards',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: provider only exposes /v2/settings/scorecards with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('Scorecard');

        const proxyConfig: ProxyConfiguration = {
            // https://help.gong.io/docs/what-the-gong-api-provides
            endpoint: '/v2/settings/scorecards',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'scorecards',
                limit: 100,
                limit_name_in_request: 'limit'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error(`Expected scorecards page to be an array, got ${typeof page}`);
            }

            const scorecards = page.map((item) => {
                const parsed = GongScorecardSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse scorecard: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            const mapped = scorecards.map((scorecard) => ({
                id: scorecard.scorecardId,
                scorecardId: scorecard.scorecardId,
                scorecardName: scorecard.scorecardName,
                ...(scorecard.workspaceId != null && { workspaceId: scorecard.workspaceId }),
                enabled: scorecard.enabled,
                updaterUserId: scorecard.updaterUserId,
                created: scorecard.created,
                updated: scorecard.updated,
                ...(scorecard.reviewMethod != null && { reviewMethod: scorecard.reviewMethod }),
                ...(scorecard.questions != null && { questions: scorecard.questions })
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Scorecard');
            }
        }

        await nango.trackDeletesEnd('Scorecard');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
