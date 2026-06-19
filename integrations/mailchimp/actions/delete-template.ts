import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    template_id: z.string().describe('The ID of the template to delete. Example: "1234"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    template_id: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a template in Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://mailchimp.com/developer/marketing/api/templates/#delete-template
            endpoint: '/3.0/templates/' + encodeURIComponent(input.template_id),
            retries: 10
        });

        if (response.status === 204 || response.status === 200) {
            return {
                success: true,
                template_id: input.template_id
            };
        }

        throw new nango.ActionError({
            type: 'delete_failed',
            message: 'Failed to delete template',
            status: response.status,
            template_id: input.template_id
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
