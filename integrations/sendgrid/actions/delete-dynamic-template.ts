import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    template_id: z.string().describe('The ID of the dynamic template to delete. Example: "d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a dynamic template and all of its versions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sendgrid.com/api-reference/transactional-templates/delete-a-template
        await nango.delete({
            endpoint: `/v3/templates/${encodeURIComponent(input.template_id)}`,
            retries: 10
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
