import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    trackerId: z.string().describe('The unique identifier of the tracker. Example: "7686842637000665959"')
});

const LanguageKeywordSchema = z.object({
    language: z.string().nullable(),
    keywords: z.array(z.string()).nullable(),
    includeRelatedForms: z.boolean().nullable()
});

const TrackerSchema = z.object({
    trackerId: z.string(),
    trackerName: z.string().nullable(),
    workspaceId: z.string().nullish(),
    languageKeywords: z.array(LanguageKeywordSchema).nullable(),
    affiliation: z.string().nullable(),
    partOfQuestion: z.boolean().nullable(),
    saidAt: z.string().nullable(),
    saidAtInterval: z.number().nullish(),
    saidAtUnit: z.string().nullish(),
    saidInTopics: z.array(z.string()).nullable(),
    filterQuery: z.string().nullish(),
    created: z.string().nullable(),
    creatorUserId: z.string().nullish(),
    updated: z.string().nullable(),
    updaterUserId: z.string().nullish()
});

const ListResponseSchema = z.object({
    requestId: z.string().optional(),
    keywordTrackers: z.array(TrackerSchema).nullish(),
    records: z.object({ cursor: z.string().nullish() }).nullish()
});

const OutputSchema = TrackerSchema;

const action = createAction({
    description: 'Retrieve a single keyword tracker from Gong.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:settings:trackers:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let cursor: string | undefined;

        while (true) {
            const response = await nango.get({
                // https://help.gong.io/docs/retrieve-tracker-details
                endpoint: '/v2/settings/trackers',
                params: {
                    ...(cursor !== undefined && { cursor })
                },
                retries: 3
            });

            if (!response.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Tracker not found',
                    trackerId: input.trackerId
                });
            }

            const parsed = ListResponseSchema.parse(response.data);
            const tracker = (parsed.keywordTrackers ?? []).find((t) => t.trackerId === input.trackerId);

            if (tracker) {
                return tracker;
            }

            const nextCursor = parsed.records?.cursor;
            if (!nextCursor) {
                break;
            }
            cursor = nextCursor;
        }

        throw new nango.ActionError({
            type: 'not_found',
            message: 'Tracker not found',
            trackerId: input.trackerId
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
