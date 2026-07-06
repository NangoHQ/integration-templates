import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Campaign ID. Example: "01KWGH6P9PERJ0AHGNBJQMH55G"')
});

const CampaignMessageAttributesSchema = z
    .object({
        channel: z.string().optional(),
        label: z.string().optional(),
        content: z.record(z.string(), z.unknown()).optional(),
        render_options: z.record(z.string(), z.unknown()).optional(),
        send_strategy: z.record(z.string(), z.unknown()).optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const CampaignAttributesSchema = z
    .object({
        name: z.string().optional(),
        status: z.string().optional(),
        channel: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        scheduled_at: z.string().nullable().optional(),
        send_options: z.record(z.string(), z.unknown()).optional(),
        render_options: z.record(z.string(), z.unknown()).optional(),
        send_strategy: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const RelationshipDataSchema = z.object({
    type: z.string(),
    id: z.string()
});

const CampaignRelationshipsSchema = z
    .object({
        campaign_messages: z
            .object({
                data: z.array(RelationshipDataSchema).optional()
            })
            .optional()
    })
    .passthrough();

const CampaignDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: CampaignAttributesSchema,
    relationships: CampaignRelationshipsSchema.optional()
});

const IncludedMessageSchema = z
    .object({
        type: z.string(),
        id: z.string(),
        attributes: CampaignMessageAttributesSchema.optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: CampaignDataSchema,
    included: z.array(IncludedMessageSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    channel: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    scheduled_at: z.string().nullable().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    relationships: z.record(z.string(), z.unknown()).optional(),
    messages: z.array(z.record(z.string(), z.unknown())).optional()
});

const action = createAction({
    description: 'Retrieve a campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/get_campaign
        const response = await nango.get({
            endpoint: `/api/campaigns/${encodeURIComponent(input.id)}`,
            params: {
                include: 'campaign-messages'
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found',
                id: input.id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const campaign = providerResponse.data;

        const messages =
            providerResponse.included
                ?.filter((item) => item.type === 'campaign-message')
                .map((item) => {
                    const base = {
                        type: item.type,
                        id: item.id,
                        ...(item.attributes !== undefined && { attributes: item.attributes })
                    };
                    return base;
                }) ?? [];

        return {
            id: campaign.id,
            type: campaign.type,
            ...(campaign.attributes.name !== undefined && { name: campaign.attributes.name }),
            ...(campaign.attributes.status !== undefined && { status: campaign.attributes.status }),
            ...(campaign.attributes.channel !== undefined && { channel: campaign.attributes.channel }),
            ...(campaign.attributes.created_at !== undefined && { created_at: campaign.attributes.created_at }),
            ...(campaign.attributes.updated_at !== undefined && { updated_at: campaign.attributes.updated_at }),
            ...(campaign.attributes.scheduled_at !== undefined && { scheduled_at: campaign.attributes.scheduled_at }),
            attributes: campaign.attributes,
            ...(campaign.relationships !== undefined && { relationships: campaign.relationships }),
            ...(messages.length > 0 && { messages })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
