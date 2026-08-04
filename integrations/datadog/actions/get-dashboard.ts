import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dashboardId: z.string().describe('Dashboard ID. Example: "ste-gtd-5rx"')
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    layout_type: z.string().optional(),
    url: z.string().optional(),
    widgets: z.array(z.unknown()).optional()
});

const DashboardSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        description: z.string().nullable().optional(),
        layout_type: z.string().nullable().optional(),
        url: z.string().nullable().optional(),
        widgets: z.array(z.unknown()).nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get a single dashboard by id, including its full widget layout.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/dashboards/#get-a-dashboard
            endpoint: `v1/dashboard/${encodeURIComponent(input.dashboardId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Dashboard not found',
                dashboard_id: input.dashboardId
            });
        }

        const dashboard = DashboardSchema.parse(response.data);

        return {
            id: dashboard.id,
            title: dashboard.title,
            ...(dashboard.description != null && { description: dashboard.description }),
            ...(dashboard.layout_type != null && { layout_type: dashboard.layout_type }),
            ...(dashboard.url != null && { url: dashboard.url }),
            ...(dashboard.widgets != null && { widgets: dashboard.widgets })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
