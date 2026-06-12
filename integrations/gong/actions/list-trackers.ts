import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().optional().describe('Workspace ID to filter trackers. Example: "7273476131570014205"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const LanguageKeywordSchema = z.object({
    language: z.string(),
    keywords: z.array(z.string()),
    includeRelatedForms: z.boolean()
});

const ProviderTrackerSchema = z.object({
    trackerId: z.string(),
    trackerName: z.string().optional(),
    workspaceId: z.string().optional(),
    languageKeywords: z.array(LanguageKeywordSchema).optional(),
    affiliation: z.string().optional(),
    partOfQuestion: z.boolean().optional(),
    saidAt: z.string().optional(),
    saidAtInterval: z.number().nullable().optional(),
    saidAtUnit: z.string().nullable().optional(),
    saidInTopics: z.array(z.string()).optional(),
    filterQuery: z.string().optional(),
    created: z.string().optional(),
    creatorUserId: z.string().nullable().optional(),
    updated: z.string().optional(),
    updaterUserId: z.string().nullable().optional()
});

const TrackerSchema = z.object({
    trackerId: z.string(),
    trackerName: z.string().optional(),
    workspaceId: z.string().optional(),
    languageKeywords: z.array(LanguageKeywordSchema).optional(),
    affiliation: z.string().optional(),
    partOfQuestion: z.boolean().optional(),
    saidAt: z.string().optional(),
    saidAtInterval: z.number().optional(),
    saidAtUnit: z.string().optional(),
    saidInTopics: z.array(z.string()).optional(),
    filterQuery: z.string().optional(),
    created: z.string().optional(),
    creatorUserId: z.string().optional(),
    updated: z.string().optional(),
    updaterUserId: z.string().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    keywordTrackers: z.array(ProviderTrackerSchema).optional(),
    records: z.object({ cursor: z.string().optional() }).optional()
});

const OutputSchema = z.object({
    trackers: z.array(TrackerSchema),
    nextCursor: z.string().optional().describe('Pagination cursor for the next page.')
});

const action = createAction({
    description: 'List keyword trackers from Gong.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-trackers',
        group: 'Trackers'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.workspaceId !== undefined) {
            params['workspaceId'] = input.workspaceId;
        }
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        const response = await nango.get({
            // https://help.gong.io/docs/what-the-gong-api-provides
            endpoint: '/v2/settings/trackers',
            params,
            retries: 3
        });

        if (response.data === null || response.data === undefined || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Gong API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const keywordTrackers = providerResponse.keywordTrackers ?? [];

        const trackers = keywordTrackers.map((tracker) => {
            return {
                trackerId: tracker.trackerId,
                ...(tracker.trackerName !== undefined && { trackerName: tracker.trackerName }),
                ...(tracker.workspaceId !== undefined && { workspaceId: tracker.workspaceId }),
                ...(tracker.languageKeywords !== undefined && { languageKeywords: tracker.languageKeywords }),
                ...(tracker.affiliation !== undefined && { affiliation: tracker.affiliation }),
                ...(tracker.partOfQuestion !== undefined && { partOfQuestion: tracker.partOfQuestion }),
                ...(tracker.saidAt !== undefined && { saidAt: tracker.saidAt }),
                ...(tracker.saidAtInterval !== null && tracker.saidAtInterval !== undefined && { saidAtInterval: tracker.saidAtInterval }),
                ...(tracker.saidAtUnit !== null && tracker.saidAtUnit !== undefined && { saidAtUnit: tracker.saidAtUnit }),
                ...(tracker.saidInTopics !== undefined && { saidInTopics: tracker.saidInTopics }),
                ...(tracker.filterQuery !== undefined && { filterQuery: tracker.filterQuery }),
                ...(tracker.created !== undefined && { created: tracker.created }),
                ...(tracker.creatorUserId !== null && tracker.creatorUserId !== undefined && { creatorUserId: tracker.creatorUserId }),
                ...(tracker.updated !== undefined && { updated: tracker.updated }),
                ...(tracker.updaterUserId !== null && tracker.updaterUserId !== undefined && { updaterUserId: tracker.updaterUserId })
            };
        });

        return {
            trackers,
            ...(providerResponse.records?.cursor != null && { nextCursor: providerResponse.records.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
