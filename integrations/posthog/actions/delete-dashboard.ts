import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.number().describe('Dashboard ID. Example: 1663108')
});

const ProviderDashboardSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    deleted: z.boolean().optional(),
    name: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a dashboard in PostHog.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-dashboard',
        group: 'Dashboards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['dashboard:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/dashboards
        // Hard delete is not allowed; PATCH deleted: true to archive the dashboard.
        const response = await nango.patch({
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/dashboards/${encodeURIComponent(String(input.id))}/`,
            data: {
                deleted: true
            },
            retries: 3
        });

        const providerDashboard = ProviderDashboardSchema.parse(response.data);

        return {
            id: providerDashboard.id,
            ...(providerDashboard.deleted !== undefined && { deleted: providerDashboard.deleted }),
            ...(providerDashboard.name != null && { name: providerDashboard.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
