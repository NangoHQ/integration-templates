import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_message_id: z.string().describe('The campaign message ID. Example: "01KWGH6P9Z1E8CN49A9DGDRMBW"'),
    template_id: z.string().describe('The reusable template ID. Example: "WmRV7f"')
});

const ProviderTemplateDataSchema = z.object({
    type: z.string(),
    id: z.string()
});

const ProviderRelationshipsSchema = z.object({
    template: z.object({
        data: ProviderTemplateDataSchema
    })
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        relationships: ProviderRelationshipsSchema
    })
});

const OutputSchema = z.object({
    campaign_message_id: z.string(),
    assigned_template_id: z.string()
});

const action = createAction({
    description: "Assign a reusable template's content to a campaign message.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/assign_template_to_campaign_message
            endpoint: '/api/campaign-message-assign-template',
            data: {
                data: {
                    type: 'campaign-message',
                    id: input.campaign_message_id,
                    relationships: {
                        template: {
                            data: {
                                type: 'template',
                                id: input.template_id
                            }
                        }
                    }
                }
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            campaign_message_id: providerResponse.data.id,
            assigned_template_id: providerResponse.data.relationships.template.data.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
