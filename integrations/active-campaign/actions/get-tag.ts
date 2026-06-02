import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Tag ID. Example: "1"')
});

const TagLinksSchema = z.object({
    contactGoalTags: z.string().optional()
});

const ProviderTagSchema = z.object({
    id: z.string(),
    tagType: z.string().optional(),
    tag: z.string().optional(),
    description: z.string().optional(),
    cdate: z.string().optional(),
    subscriber_count: z.string().optional(),
    links: TagLinksSchema.optional()
});

const ProviderResponseSchema = z.object({
    tag: ProviderTagSchema
});

const OutputSchema = z.object({
    id: z.string(),
    tagType: z.string().optional(),
    tag: z.string().optional(),
    description: z.string().optional(),
    cdate: z.string().optional(),
    subscriber_count: z.string().optional(),
    links: TagLinksSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single tag from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-tag',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/retrieve-a-tag
            endpoint: `/3/tags/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);
        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerTag = providerResponse.tag;

        return {
            id: providerTag.id,
            ...(providerTag.tagType !== undefined && { tagType: providerTag.tagType }),
            ...(providerTag.tag !== undefined && { tag: providerTag.tag }),
            ...(providerTag.description !== undefined && { description: providerTag.description }),
            ...(providerTag.cdate !== undefined && { cdate: providerTag.cdate }),
            ...(providerTag.subscriber_count !== undefined && { subscriber_count: providerTag.subscriber_count }),
            ...(providerTag.links !== undefined && { links: providerTag.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
