import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('PostHog project ID. Example: 309484'),
    insight_id: z.number().describe('Insight ID. Example: 9038220')
});

const InsightSchema = z
    .object({
        id: z.number(),
        short_id: z.string(),
        name: z.string().nullish(),
        derived_name: z.string().nullish(),
        query: z.unknown().nullish(),
        order: z.number().nullish(),
        deleted: z.boolean(),
        dashboards: z.array(z.number()).nullish(),
        dashboard_tiles: z
            .array(
                z.object({
                    id: z.number(),
                    dashboard_id: z.number(),
                    deleted: z.boolean().nullish()
                })
            )
            .nullish(),
        last_refresh: z.string().nullish(),
        cache_target_age: z.string().nullish(),
        next_allowed_client_refresh: z.string().nullish(),
        result: z.unknown().nullish(),
        hasMore: z.boolean().nullish(),
        columns: z.array(z.string()).nullish(),
        created_at: z.string(),
        created_by: z.unknown().nullish(),
        description: z.string().nullish(),
        updated_at: z.string(),
        tags: z.array(z.unknown()).nullish(),
        favorited: z.boolean().nullish(),
        last_modified_at: z.string().nullish(),
        last_modified_by: z.unknown().nullish(),
        is_sample: z.boolean().nullish(),
        effective_restriction_level: z.number().nullish(),
        effective_privilege_level: z.number().nullish(),
        user_access_level: z.string().nullish(),
        timezone: z.string().nullish(),
        is_cached: z.boolean().nullish(),
        query_status: z.unknown().nullish(),
        hogql: z.string().nullish(),
        types: z.array(z.unknown()).nullish(),
        resolved_date_range: z
            .object({
                date_from: z.string(),
                date_to: z.string()
            })
            .nullish(),
        _create_in_folder: z.string().nullish(),
        alerts: z.array(z.unknown()).nullish(),
        last_viewed_at: z.string().nullish()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single insight from PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: InsightSchema,
    scopes: ['insight:read'],

    exec: async (nango, input): Promise<z.infer<typeof InsightSchema>> => {
        const config: ProxyConfiguration = {
            // https://posthog.com/docs/api/insights
            endpoint: `/api/projects/${encodeURIComponent(String(input.project_id))}/insights/${encodeURIComponent(String(input.insight_id))}/`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Insight not found',
                insight_id: input.insight_id,
                project_id: input.project_id
            });
        }

        const providerInsight = InsightSchema.parse(response.data);

        return providerInsight;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
