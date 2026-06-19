import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tag: z.string().describe('Tag name. Example: "My Tag"'),
    tagType: z.string().optional().describe('Tag type. Example: "contact"'),
    description: z.string().optional().describe('Tag description. Example: "Description"')
});

const ProviderTagSchema = z.object({
    id: z.string(),
    tag: z.string(),
    tagType: z.string().optional(),
    description: z.string().optional(),
    cdate: z.string().optional(),
    subscriber_count: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    tag: z.string(),
    tagType: z.string().optional(),
    description: z.string().optional(),
    cdate: z.string().optional(),
    subscriber_count: z.string().optional()
});

const action = createAction({
    description: 'Create a tag in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.activecampaign.com/reference/tags
            endpoint: '/3/tags',
            data: {
                tag: {
                    tag: input.tag,
                    ...(input.tagType !== undefined && { tagType: input.tagType }),
                    ...(input.description !== undefined && { description: input.description })
                }
            },
            retries: 3
        });

        const providerResponse = z.object({ tag: ProviderTagSchema }).parse(response.data);
        const providerTag = providerResponse.tag;

        return {
            id: providerTag.id,
            tag: providerTag.tag,
            ...(providerTag.tagType !== undefined && { tagType: providerTag.tagType }),
            ...(providerTag.description !== undefined && { description: providerTag.description }),
            ...(providerTag.cdate !== undefined && { cdate: providerTag.cdate }),
            ...(providerTag.subscriber_count !== undefined && { subscriber_count: providerTag.subscriber_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
