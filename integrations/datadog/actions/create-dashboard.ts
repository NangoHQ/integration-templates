import { z } from 'zod';
import { createAction } from 'nango';

const WidgetSchema = z.object({}).passthrough();

const InputSchema = z.object({
    title: z.string().describe('Dashboard title. Example: "My Dashboard"'),
    layout_type: z.enum(['ordered', 'free']).optional().describe('Dashboard layout type. Example: "ordered"'),
    widgets: z.array(WidgetSchema).optional().describe('List of widgets to display on the dashboard.')
});

const ProviderDashboardSchema = z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    layout_type: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    is_read_only: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    modified_at: z.string().nullable().optional(),
    author_handle: z.string().nullable().optional(),
    widgets: z.array(z.object({}).passthrough()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    layout_type: z.string().optional(),
    url: z.string().optional(),
    is_read_only: z.boolean().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    author_handle: z.string().optional(),
    widgets: z.array(z.object({}).passthrough()).optional()
});

const action = createAction({
    description: 'Create a new dashboard with a widget layout.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/dashboards/#create-a-dashboard
            endpoint: 'v1/dashboard',
            data: {
                title: input.title,
                ...(input.layout_type !== undefined && { layout_type: input.layout_type }),
                ...(input.widgets !== undefined && { widgets: input.widgets })
            },
            retries: 1
        });

        const providerDashboard = ProviderDashboardSchema.parse(response.data);

        return {
            id: String(providerDashboard.id),
            ...(providerDashboard.title != null && { title: providerDashboard.title }),
            ...(providerDashboard.description != null && { description: providerDashboard.description }),
            ...(providerDashboard.layout_type != null && { layout_type: providerDashboard.layout_type }),
            ...(providerDashboard.url != null && { url: providerDashboard.url }),
            ...(providerDashboard.is_read_only != null && { is_read_only: providerDashboard.is_read_only }),
            ...(providerDashboard.created_at != null && { created_at: providerDashboard.created_at }),
            ...(providerDashboard.modified_at != null && { modified_at: providerDashboard.modified_at }),
            ...(providerDashboard.author_handle != null && { author_handle: providerDashboard.author_handle }),
            ...(providerDashboard.widgets != null && { widgets: providerDashboard.widgets })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
