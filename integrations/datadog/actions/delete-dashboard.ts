import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dashboardId: z.string().describe('The ID of the dashboard to delete. Example: "abc-def-123"')
});

const OutputSchema = z.object({
    deleted_dashboard_id: z.string().describe('The ID of the deleted dashboard.')
});

const action = createAction({
    description: 'Delete a dashboard.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.datadoghq.com/api/latest/dashboards/#delete-a-dashboard
            endpoint: `v1/dashboard/${encodeURIComponent(input.dashboardId)}`,
            retries: 1
        });

        const providerResponse = z
            .object({
                deleted_dashboard_id: z.string()
            })
            .parse(response.data);

        return {
            deleted_dashboard_id: providerResponse.deleted_dashboard_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
