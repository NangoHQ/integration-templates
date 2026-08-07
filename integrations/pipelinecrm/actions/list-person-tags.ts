import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    entries: z.array(ProviderTagSchema)
});

const TagSchema = z.object({
    id: z.number(),
    name: z.string()
});

const OutputSchema = z.object({
    tags: z.array(TagSchema)
});

const action = createAction({
    description: 'List predefined tags available for tagging people/contacts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/predefined_contacts_tags.json',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            tags: providerResponse.entries.map((tag) => ({
                id: tag.id,
                name: tag.name
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
