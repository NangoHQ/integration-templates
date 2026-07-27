import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const LegalEntitySchema = z.object({
    id: z.string(),
    name: z.string(),
    legal_name: z.string().nullable().optional(),
    type: z.enum(['entity', 'location', 'site']),
    parent_id: z.string().nullable().optional(),
    display_name: z.string()
});

const OutputSchema = z.object({
    items: z.array(LegalEntitySchema)
});

const action = createAction({
    description: "List the account's legal entities/locations/sites (HR org structure).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_account'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://workable.readme.io/reference/legal_entities
        const response = await nango.get({
            endpoint: '/spi/v3/legal_entities',
            retries: 3
        });

        const parsed = z.array(LegalEntitySchema).parse(response.data);

        return {
            items: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
