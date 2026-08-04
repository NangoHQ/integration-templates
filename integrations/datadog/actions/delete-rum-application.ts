import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    app_id: z.string().trim().min(1).describe('The ID of the RUM application to delete. Example: "9361fc7f-7206-40b0-9401-262b2896a5b0"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a RUM application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.datadoghq.com/api/latest/rum/#delete-a-rum-application
            endpoint: `v2/rum/applications/${encodeURIComponent(input.app_id)}`,
            retries: 10
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Unexpected status ${response.status} when deleting RUM application.`
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
