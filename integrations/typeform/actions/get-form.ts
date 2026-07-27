import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.string().describe('The unique ID of the form. Example: "WMpBq4vc"')
});

const OutputSchema = z
    .object({
        id: z.string(),
        type: z.string().optional(),
        title: z.string().optional(),
        workspace: z
            .object({
                href: z.string()
            })
            .passthrough()
            .optional(),
        theme: z
            .object({
                href: z.string()
            })
            .passthrough()
            .optional(),
        _links: z
            .object({
                display: z.string().optional()
            })
            .passthrough()
            .optional(),
        fields: z.array(z.object({}).passthrough()).optional(),
        welcome_screens: z.array(z.object({}).passthrough()).optional(),
        thankyou_screens: z.array(z.object({}).passthrough()).optional(),
        logic: z.array(z.object({}).passthrough()).optional(),
        variables: z.array(z.object({}).passthrough()).optional(),
        settings: z.object({}).passthrough().optional(),
        hidden: z.array(z.string()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['forms:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.typeform.com/developers/create/
            endpoint: `/forms/${encodeURIComponent(input.form_id)}`,
            retries: 3
        });

        const providerForm = OutputSchema.parse(response.data);
        return providerForm;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
