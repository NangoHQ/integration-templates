import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    form_id: z.string().describe('Form ID to delete. Example: "tlGO1VrX"')
});

const OutputSchema = z.object({
    success: z.literal(true),
    form_id: z.string()
});

const action = createAction({
    description: 'Delete a form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['forms:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.typeform.com/developers/create/
            endpoint: `/forms/${encodeURIComponent(input.form_id)}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true,
            form_id: input.form_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
