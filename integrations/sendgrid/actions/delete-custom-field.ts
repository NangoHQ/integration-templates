import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    custom_field_id: z.string().describe('The ID of the custom field to delete. Example: "w1_T"')
});

const OutputSchema = z.object({
    custom_field_id: z.string()
});

const action = createAction({
    description: 'Delete a custom contact field definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://www.twilio.com/docs/sendgrid/api-reference/custom-fields/delete-custom-field-definition
            endpoint: `/v3/marketing/field_definitions/${encodeURIComponent(input.custom_field_id)}`,
            retries: 1
        });

        return {
            custom_field_id: input.custom_field_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
