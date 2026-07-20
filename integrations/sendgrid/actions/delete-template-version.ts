import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    template_id: z.string().describe('The ID of the template. Example: d-e6adcea686a0410aa1f6d05879bf935d'),
    version_id: z.string().describe('The ID of the version to delete. Example: a7212169-c965-4808-b0ee-f9728250515d')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Delete a template version.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates.delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.twilio.com/docs/sendgrid/api-reference/templates-versions/delete-template-version
            endpoint: `/v3/templates/${encodeURIComponent(input.template_id)}/versions/${encodeURIComponent(input.version_id)}`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 204 No Content, got ${response.status}`
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
