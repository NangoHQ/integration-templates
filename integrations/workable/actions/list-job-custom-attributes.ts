import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    shortcode: z.string().describe('The job shortcode. Example: "9CD658E13E"')
});

const ChoiceSchema = z
    .object({
        id: z.string(),
        body: z.string(),
        hint: z.string().optional()
    })
    .passthrough();

const CustomAttributeSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        label: z.string(),
        required: z.boolean().optional(),
        provider: z.string().optional(),
        enabled: z.boolean().optional(),
        hint: z.string().optional(),
        single_answer: z.boolean().optional(),
        choices: z.array(ChoiceSchema).optional(),
        supported_file_types: z.array(z.string()).optional(),
        max_file_size: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    custom_attributes: z.array(CustomAttributeSchema)
});

const action = createAction({
    description: 'List custom attributes configured for a specific job.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/job-custom-attributes
            endpoint: `/spi/v3/jobs/${encodeURIComponent(input.shortcode)}/custom_attributes`,
            retries: 3
        });

        const data = z
            .object({
                custom_attributes: z.array(z.unknown())
            })
            .parse(response.data);

        const customAttributes = data.custom_attributes.map((item) => {
            return CustomAttributeSchema.parse(item);
        });

        return {
            custom_attributes: customAttributes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
