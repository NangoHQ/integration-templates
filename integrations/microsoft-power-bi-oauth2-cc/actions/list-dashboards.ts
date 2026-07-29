import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace (group) ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"')
});

const ProviderDashboardSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    isReadOnly: z.boolean().optional(),
    embedUrl: z.string().optional(),
    webUrl: z.string().optional()
});

const ProviderListSchema = z.object({
    value: z.array(ProviderDashboardSchema)
});

const DashboardSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    isReadOnly: z.boolean().optional(),
    embedUrl: z.string().optional(),
    webUrl: z.string().optional()
});

const OutputSchema = z.object({
    dashboards: z.array(DashboardSchema)
});

const action = createAction({
    description: 'List dashboards in a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/dashboards/get-dashboards-in-group
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/dashboards`,
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);

        return {
            dashboards: providerList.value.map((dashboard) => ({
                id: dashboard.id,
                ...(dashboard.displayName !== undefined && { displayName: dashboard.displayName }),
                ...(dashboard.isReadOnly !== undefined && { isReadOnly: dashboard.isReadOnly }),
                ...(dashboard.embedUrl !== undefined && { embedUrl: dashboard.embedUrl }),
                ...(dashboard.webUrl !== undefined && { webUrl: dashboard.webUrl })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
