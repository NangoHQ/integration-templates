import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webinar_id: z.string().describe('The unique identifier of the webinar to delete. Example: "123456789"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    webinar_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a webinar in Zoom.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webinar:write:admin', 'webinar:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/deleteWebinar
        const { status } = await nango.delete({
            endpoint: `/webinars/${input.webinar_id}`,
            retries: 1
        });

        if (status !== 204) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Zoom returned status ${status} when deleting webinar ${input.webinar_id}.`
            });
        }

        return {
            success: true,
            webinar_id: input.webinar_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
