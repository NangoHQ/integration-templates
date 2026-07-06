import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Tag name. Example: "new-tag"'),
    tag_group_id: z.string().optional().describe('Optional tag group ID to file the tag under. Omit to use the default tag group.')
});

const ProviderTagResponseSchema = z.object({
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
    description: 'Create a tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            data: {
                type: 'tag';
                attributes: {
                    name: string;
                };
                relationships?: {
                    'tag-group': {
                        data: {
                            type: 'tag-group';
                            id: string;
                        };
                    };
                };
            };
        } = {
            data: {
                type: 'tag',
                attributes: {
                    name: input.name
                }
            }
        };

        if (input.tag_group_id !== undefined) {
            requestBody.data.relationships = {
                'tag-group': {
                    data: {
                        type: 'tag-group',
                        id: input.tag_group_id
                    }
                }
            };
        }

        // https://developers.klaviyo.com/en/reference/create_tag
        const response = await nango.post({
            endpoint: '/api/tags',
            data: requestBody,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsed = ProviderTagResponseSchema.parse(response.data);

        return {
            id: parsed.data.id,
            name: parsed.data.attributes.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
