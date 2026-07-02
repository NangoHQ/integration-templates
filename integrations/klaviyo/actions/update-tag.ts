import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Tag ID. Example: "aa27b1b8-9198-47da-86bf-3f6196d4c074"'),
    name: z.string().describe('New name for the tag. Example: "updated-tag-name"')
});

const ProviderTagSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            name: z.string()
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string()
});

const action = createAction({
    description: 'Rename a tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.klaviyo.com/en/reference/update_tag
            endpoint: `/api/tags/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'tag',
                    id: input.id,
                    attributes: {
                        name: input.name
                    }
                }
            },
            retries: 3
        });

        if (response.data && typeof response.data === 'object') {
            const providerTag = ProviderTagSchema.parse(response.data);

            return {
                id: providerTag.data.id,
                name: providerTag.data.attributes.name
            };
        }

        return {
            id: input.id,
            name: input.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
