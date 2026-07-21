import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.string().describe('Form ID. Example: "WMpBq4vc"'),
    response_ids: z.array(z.string()).describe('Array of response IDs to delete. Up to 1000 IDs per call.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Bulk-delete one or more form responses.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['offline'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedFormId = encodeURIComponent(input.form_id);
        const idsParam = input.response_ids.map(encodeURIComponent).join(',');

        // https://www.typeform.com/developers/responses/
        await nango.delete({
            endpoint: `/forms/${encodedFormId}/responses`,
            params: {
                included_response_ids: idsParam
            },
            retries: 1
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
