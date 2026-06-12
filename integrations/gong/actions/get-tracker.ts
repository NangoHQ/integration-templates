import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    trackerId: z.string().describe('The unique identifier of the tracker. Example: "7686842637000665959"')
});

const LanguageKeywordSchema = z.object({
    language: z.string(),
    keywords: z.array(z.string()),
    includeRelatedForms: z.boolean()
});

const TrackerSchema = z.object({
    trackerId: z.string(),
    trackerName: z.string(),
    workspaceId: z.string().optional(),
    languageKeywords: z.array(LanguageKeywordSchema),
    affiliation: z.string(),
    partOfQuestion: z.boolean(),
    saidAt: z.string(),
    saidAtInterval: z.number().nullable().optional(),
    saidAtUnit: z.string().nullable().optional(),
    saidInTopics: z.array(z.string()),
    filterQuery: z.string().optional(),
    created: z.string(),
    creatorUserId: z.string().nullable().optional(),
    updated: z.string(),
    updaterUserId: z.string().nullable().optional()
});

const OutputSchema = TrackerSchema;

const action = createAction({
    description: 'Retrieve a single keyword tracker from Gong.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-tracker',
        group: 'Trackers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:settings:trackers:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.gong.io/docs/retrieve-tracker-details
            endpoint: '/v2/settings/trackers',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Tracker not found',
                trackerId: input.trackerId
            });
        }

        const ListResponseSchema = z.object({
            requestId: z.string(),
            keywordTrackers: z.array(TrackerSchema)
        });

        const parsed = ListResponseSchema.parse(response.data);
        const tracker = parsed.keywordTrackers.find((t) => t.trackerId === input.trackerId);

        if (!tracker) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Tracker not found',
                trackerId: input.trackerId
            });
        }

        return tracker;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
