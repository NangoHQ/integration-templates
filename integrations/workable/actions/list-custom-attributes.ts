import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ChoiceSchema = z.object({
    id: z.string(),
    body: z.string(),
    hint: z.string().nullable().optional(),
    translations: z.record(z.string(), z.unknown()).optional()
});

const CustomAttributeSchema = z.object({
    id: z.string(),
    type: z.string(),
    enabled: z.boolean(),
    label: z.string(),
    hint: z.string().nullable().optional(),
    single_answer: z.boolean().optional(),
    choices: z.array(ChoiceSchema).optional()
});

const OutputSchema = z.object({
    custom_attributes: z.array(CustomAttributeSchema)
});

const action = createAction({
    description: "List the account's custom attribute definitions.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config = {
            // https://workable.readme.io/reference/custom_attributes
            endpoint: '/spi/v3/custom_attributes',
            retries: 3
        };
        const response = await nango.get(config);

        const parsedResponse = z
            .object({
                custom_attributes: z.array(z.unknown())
            })
            .parse(response.data);

        const customAttributes = parsedResponse.custom_attributes.map((item) => {
            const attr = CustomAttributeSchema.parse(item);
            return {
                id: attr.id,
                type: attr.type,
                enabled: attr.enabled,
                label: attr.label,
                ...(attr.hint != null && { hint: attr.hint }),
                ...(attr.single_answer !== undefined && { single_answer: attr.single_answer }),
                ...(attr.choices !== undefined && { choices: attr.choices })
            };
        });

        return {
            custom_attributes: customAttributes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
