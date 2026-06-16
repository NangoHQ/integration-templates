import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const ProviderCohortSyncMetadataSchema = z.object({
    target: z.string(),
    frequency: z.string().optional(),
    last_successful: z.string().nullable().optional(),
    last_failure: z.string().nullable().optional(),
    params: z.record(z.string(), z.unknown()).optional()
});

const ProviderCohortSchema = z.object({
    appId: z.number(),
    archived: z.boolean(),
    definition: z.record(z.string(), z.unknown()).optional(),
    description: z.string().nullable().optional(),
    finished: z.boolean().optional(),
    id: z.string(),
    name: z.string(),
    owners: z.array(z.string()).optional(),
    viewers: z.array(z.string()).optional(),
    published: z.boolean(),
    size: z.number().nullable().optional(),
    type: z.string(),
    lastMod: z.number().optional(),
    createdAt: z.number().optional(),
    lastComputed: z.number().nullable().optional(),
    hidden: z.boolean().optional(),
    metadata: z.array(z.string()).nullable().optional(),
    view_count: z.number().nullable().optional(),
    popularity: z.number().nullable().optional(),
    last_viewed: z.number().nullable().optional(),
    chart_id: z.string().nullable().optional(),
    edit_id: z.string().nullable().optional(),
    is_predictive: z.boolean().optional(),
    is_official_content: z.boolean().optional(),
    location_id: z.string().nullable().optional(),
    shortcut_ids: z.array(z.string()).optional(),
    syncMetadata: z.array(ProviderCohortSyncMetadataSchema).nullable().optional()
});

const ProviderListResponseSchema = z.object({
    cohorts: z.array(ProviderCohortSchema)
});

const CohortOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    appId: z.number(),
    archived: z.boolean(),
    published: z.boolean(),
    size: z.number().optional(),
    type: z.string(),
    description: z.string().optional(),
    finished: z.boolean().optional(),
    owners: z.array(z.string()).optional(),
    viewers: z.array(z.string()).optional(),
    lastMod: z.number().optional(),
    createdAt: z.number().optional(),
    lastComputed: z.number().optional(),
    hidden: z.boolean().optional(),
    is_predictive: z.boolean().optional(),
    is_official_content: z.boolean().optional(),
    location_id: z.string().optional(),
    shortcut_ids: z.array(z.string()).optional(),
    chart_id: z.string().optional(),
    edit_id: z.string().optional(),
    view_count: z.number().optional(),
    popularity: z.number().optional(),
    last_viewed: z.number().optional(),
    metadata: z.array(z.string()).optional(),
    syncMetadata: z.array(z.record(z.string(), z.unknown())).optional()
});

const OutputSchema = z.object({
    cohorts: z.array(CohortOutputSchema)
});

const action = createAction({
    description: 'List cohorts.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-cohorts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://amplitude.com/docs/apis/analytics/behavioral-cohorts
            endpoint: '/api/3/cohorts',
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderListResponseSchema.parse(response.data);

        const cohorts = parsed.cohorts.map((cohort) => ({
            id: cohort.id,
            name: cohort.name,
            appId: cohort.appId,
            archived: cohort.archived,
            published: cohort.published,
            type: cohort.type,
            ...(cohort.size != null && { size: cohort.size }),
            ...(cohort.description != null && { description: cohort.description }),
            ...(cohort.finished !== undefined && { finished: cohort.finished }),
            ...(cohort.owners !== undefined && { owners: cohort.owners }),
            ...(cohort.viewers !== undefined && { viewers: cohort.viewers }),
            ...(cohort.lastMod !== undefined && { lastMod: cohort.lastMod }),
            ...(cohort.createdAt !== undefined && { createdAt: cohort.createdAt }),
            ...(cohort.lastComputed != null && { lastComputed: cohort.lastComputed }),
            ...(cohort.hidden !== undefined && { hidden: cohort.hidden }),
            ...(cohort.is_predictive !== undefined && { is_predictive: cohort.is_predictive }),
            ...(cohort.is_official_content !== undefined && { is_official_content: cohort.is_official_content }),
            ...(cohort.location_id != null && { location_id: cohort.location_id }),
            ...(cohort.shortcut_ids !== undefined && { shortcut_ids: cohort.shortcut_ids }),
            ...(cohort.chart_id != null && { chart_id: cohort.chart_id }),
            ...(cohort.edit_id != null && { edit_id: cohort.edit_id }),
            ...(cohort.view_count != null && { view_count: cohort.view_count }),
            ...(cohort.popularity != null && { popularity: cohort.popularity }),
            ...(cohort.last_viewed != null && { last_viewed: cohort.last_viewed }),
            ...(cohort.metadata != null && { metadata: cohort.metadata }),
            ...(cohort.syncMetadata != null && { syncMetadata: cohort.syncMetadata })
        }));

        return { cohorts };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
