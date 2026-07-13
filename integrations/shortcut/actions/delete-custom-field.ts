import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    custom_field_id: z.string().describe('The unique ID of the custom field to delete. Example: "6a53c255-dbbc-4bc8-8b96-a982e615f120"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a workspace custom field.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shortcut.com/api/rest/v3#Delete-Custom-Field
        await nango.delete({
            endpoint: `/api/v3/custom-fields/${encodeURIComponent(input.custom_field_id)}`,
            retries: 3
        });

        return {
            id: input.custom_field_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
