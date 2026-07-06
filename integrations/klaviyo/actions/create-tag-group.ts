import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe("Name of the tag group. Example: 'Campaign Tags'"),
    exclusive: z.boolean().optional().describe('Whether a tagged resource can only carry one tag from this group at a time. Defaults to false.')
});

const ProviderTagGroupSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            name: z.string(),
            exclusive: z.boolean()
        })
    })
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the tag group.'),
    name: z.string().describe('The name of the tag group.'),
    exclusive: z.boolean().describe('Whether the tag group is exclusive.')
});

const action = createAction({
    description: 'Create a tag group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/create_tag_group
            endpoint: '/api/tag-groups',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'tag-group',
                    attributes: {
                        name: input.name,
                        exclusive: input.exclusive ?? false
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderTagGroupSchema.parse(response.data);

        return {
            id: parsed.data.id,
            name: parsed.data.attributes.name,
            exclusive: parsed.data.attributes.exclusive
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
