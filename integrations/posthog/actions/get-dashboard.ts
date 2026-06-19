import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.number().describe('Dashboard ID. Example: 1663108')
});

const UserSchema = z
    .object({
        id: z.number(),
        uuid: z.string().optional(),
        distinct_id: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        is_email_verified: z.boolean().optional(),
        hedgehog_config: z.unknown().optional(),
        role_at_organization: z.string().optional()
    })
    .passthrough();

const DashboardSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        pinned: z.boolean().optional(),
        created_at: z.string().optional(),
        created_by: UserSchema.nullable().optional(),
        last_accessed_at: z.string().nullable().optional(),
        last_viewed_at: z.string().nullable().optional(),
        is_shared: z.boolean().optional(),
        deleted: z.boolean().optional(),
        creation_mode: z.string().optional(),
        filters: z.unknown().optional(),
        variables: z.unknown().optional(),
        breakdown_colors: z.unknown().optional(),
        data_color_theme_id: z.unknown().optional(),
        tags: z.array(z.unknown()).optional(),
        restriction_level: z.number().optional(),
        effective_restriction_level: z.number().optional(),
        effective_privilege_level: z.number().optional(),
        user_access_level: z.string().optional(),
        access_control_version: z.string().optional(),
        last_refresh: z.string().nullable().optional(),
        persisted_filters: z.unknown().optional(),
        persisted_variables: z.unknown().optional(),
        team_id: z.number().optional(),
        quick_filter_ids: z.array(z.string()).optional(),
        tiles: z.array(z.record(z.string(), z.unknown())).optional(),
        use_template: z.string().optional(),
        use_dashboard: z.number().optional(),
        delete_insights: z.boolean().optional(),
        _create_in_folder: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single dashboard from PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: DashboardSchema,
    scopes: ['dashboard:read'],

    exec: async (nango, input) => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/dashboards
        const response = await nango.get({
            endpoint: `/api/projects/${encodeURIComponent(String(projectId))}/dashboards/${encodeURIComponent(String(input.id))}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Dashboard not found',
                dashboard_id: input.id
            });
        }

        const dashboard = DashboardSchema.parse(response.data);
        return dashboard;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
