import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().describe('Workspace (group) ID where the dashboard should be created. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    name: z.string().describe('Name of the new dashboard. Example: "Registry Test Dashboard"')
});

const ProviderDashboardSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    isReadOnly: z.boolean().optional(),
    embedUrl: z.string().optional(),
    webUrl: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    isReadOnly: z.boolean().optional(),
    embedUrl: z.string().optional(),
    webUrl: z.string().optional()
});

const action = createAction({
    description: 'Create a new, empty dashboard in a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/dashboards/create-dashboard
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.workspaceId)}/dashboards`,
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Power BI API'
            });
        }

        const providerDashboard = ProviderDashboardSchema.parse(response.data);

        return {
            id: providerDashboard.id,
            ...(providerDashboard.displayName !== undefined && { displayName: providerDashboard.displayName }),
            ...(providerDashboard.isReadOnly !== undefined && { isReadOnly: providerDashboard.isReadOnly }),
            ...(providerDashboard.embedUrl !== undefined && { embedUrl: providerDashboard.embedUrl }),
            ...(providerDashboard.webUrl !== undefined && { webUrl: providerDashboard.webUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
