import { z } from 'zod';
import { createAction } from 'nango';

const WidgetSchema = z
    .object({
        id: z.number().optional(),
        definition: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const InputSchema = z.object({
    dashboard_id: z.string().trim().min(1).describe('The ID of the dashboard to update. Example: "abc-def-123"'),
    title: z.string().describe('The new title for the dashboard.'),
    layout_type: z.string().describe('The layout type of the dashboard. Example: "ordered" or "free".'),
    description: z.string().nullable().optional().describe('The description of the dashboard.'),
    widgets: z.array(WidgetSchema).describe('The list of widgets to display on the dashboard.'),
    template_variables: z.array(z.record(z.string(), z.unknown())).optional().describe('The list of template variables for the dashboard.'),
    notify_list: z.array(z.string()).optional().describe('The list of handles of users to notify when changes are made to this dashboard.'),
    restricted_roles: z.array(z.string()).optional().describe('A list of role UUIDs that have access to the dashboard.')
});

const ProviderDashboardSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        description: z.string().nullable().optional(),
        layout_type: z.string(),
        url: z.string().optional(),
        widgets: z.array(WidgetSchema).optional(),
        template_variables: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
        notify_list: z.array(z.string()).optional().nullable(),
        restricted_roles: z.array(z.string()).optional().nullable(),
        created_at: z.string().optional(),
        modified_at: z.string().optional(),
        author_handle: z.string().optional(),
        author_name: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    layout_type: z.string(),
    url: z.string().optional(),
    widgets: z.array(WidgetSchema).optional(),
    template_variables: z.array(z.record(z.string(), z.unknown())).optional(),
    notify_list: z.array(z.string()).optional(),
    restricted_roles: z.array(z.string()).optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    author_handle: z.string().optional(),
    author_name: z.string().optional()
});

const action = createAction({
    description: "Update a dashboard's title, layout, or widgets.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['dashboards_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            title: string;
            layout_type: string;
            widgets: unknown[];
            description?: string | null;
            template_variables?: unknown[];
            notify_list?: string[];
            restricted_roles?: string[];
        } = {
            title: input.title,
            layout_type: input.layout_type,
            widgets: input.widgets
        };

        if (input.description !== undefined) {
            body.description = input.description;
        }

        if (input.template_variables !== undefined) {
            body.template_variables = input.template_variables;
        }

        if (input.notify_list !== undefined) {
            body.notify_list = input.notify_list;
        }

        if (input.restricted_roles !== undefined) {
            body.restricted_roles = input.restricted_roles;
        }

        // https://docs.datadoghq.com/api/latest/dashboards/#update-a-dashboard
        const response = await nango.put({
            endpoint: `v1/dashboard/${encodeURIComponent(input.dashboard_id)}`,
            data: body,
            retries: 3
        });

        const providerDashboard = ProviderDashboardSchema.parse(response.data);

        return {
            id: providerDashboard.id,
            title: providerDashboard.title,
            layout_type: providerDashboard.layout_type,
            url: providerDashboard.url,
            ...(providerDashboard.description != null && { description: providerDashboard.description }),
            ...(providerDashboard.widgets != null && { widgets: providerDashboard.widgets }),
            ...(providerDashboard.template_variables != null && { template_variables: providerDashboard.template_variables }),
            ...(providerDashboard.notify_list != null && { notify_list: providerDashboard.notify_list }),
            ...(providerDashboard.restricted_roles != null && { restricted_roles: providerDashboard.restricted_roles }),
            ...(providerDashboard.created_at != null && { created_at: providerDashboard.created_at }),
            ...(providerDashboard.modified_at != null && { modified_at: providerDashboard.modified_at }),
            ...(providerDashboard.author_handle != null && { author_handle: providerDashboard.author_handle }),
            ...(providerDashboard.author_name != null && { author_name: providerDashboard.author_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
