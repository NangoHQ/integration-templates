import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().min(1).describe('ID of the tag to update. Example: "1"'),
    tag: z.string().optional().describe('Name of the tag being updated'),
    tagType: z.string().optional().describe('Tag-type of the tag being updated. Possible values: template, contact'),
    description: z.string().nullable().optional().describe('Description of the tag being updated')
});

const ProviderTagSchema = z.object({
    tagType: z.string().optional(),
    tag: z.string().optional(),
    description: z.string().nullable().optional(),
    cdate: z.string().optional(),
    links: z.record(z.string(), z.string()).optional(),
    id: z.string().optional()
});

const OutputSchema = z.object({
    tag: ProviderTagSchema
});

const action = createAction({
    description: 'Update a tag in ActiveCampaign',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.activecampaign.com/reference/update-a-tag
        const response = await nango.patch({
            endpoint: `/3/tags/${encodeURIComponent(String(input.id))}`,
            data: {
                tag: {
                    ...(input.tag !== undefined && { tag: input.tag }),
                    ...(input.tagType !== undefined && { tagType: input.tagType }),
                    ...(input.description !== undefined && { description: input.description })
                }
            },
            retries: 3
        });

        const parsed = z
            .object({
                tag: ProviderTagSchema
            })
            .parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
