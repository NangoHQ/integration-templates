import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GongScorecardSchema = z.object({
    scorecardId: z.string().nullable(),
    scorecardName: z.string().nullable(),
    workspaceId: z.string().nullish(),
    enabled: z.boolean().nullable(),
    updaterUserId: z.string().nullable(),
    created: z.string().nullable(),
    updated: z.string().nullable(),
    reviewMethod: z.string().nullish(),
    questions: z.array(z.record(z.string(), z.unknown())).nullish()
});

const ScorecardSchema = z.object({
    id: z.string(),
    scorecardId: z.string().nullable(),
    scorecardName: z.string().nullable(),
    workspaceId: z.string().nullish(),
    enabled: z.boolean().nullable(),
    updaterUserId: z.string().nullable(),
    created: z.string().nullable(),
    updated: z.string().nullable(),
    reviewMethod: z.string().nullish(),
    questions: z.array(z.record(z.string(), z.unknown())).nullish()
});

const sync = createSync({
    description: 'Sync scorecards from Gong',
    version: '1.0.1',
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

        // Collect all pages first so delete tracking only opens on a confirmed full enumeration.
        const allMapped: ReturnType<typeof GongScorecardSchema.parse>[] = [];

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error(`Expected scorecards page to be an array, got ${typeof page}`);
            }

            for (const item of page) {
                const parsed = GongScorecardSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse scorecard: ${parsed.error.message}`);
                }
                allMapped.push(parsed.data);
            }
        }

        const mapped = allMapped.map((scorecard) => {
            if (!scorecard.scorecardId) {
                throw new Error('Expected scorecardId to be non-null');
            }

            return {
                id: scorecard.scorecardId,
                scorecardId: scorecard.scorecardId,
                scorecardName: scorecard.scorecardName,
                ...(scorecard.workspaceId !== undefined && { workspaceId: scorecard.workspaceId }),
                enabled: scorecard.enabled,
                updaterUserId: scorecard.updaterUserId,
                created: scorecard.created,
                updated: scorecard.updated,
                ...(scorecard.reviewMethod !== undefined && { reviewMethod: scorecard.reviewMethod }),
                ...(scorecard.questions !== undefined && { questions: scorecard.questions })
            };
        });

        // Only reach here after a successful full enumeration and identity validation.
        await nango.trackDeletesStart('Scorecard');

        if (mapped.length > 0) {
            await nango.batchSave(mapped, 'Scorecard');
        }

        await nango.trackDeletesEnd('Scorecard');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
