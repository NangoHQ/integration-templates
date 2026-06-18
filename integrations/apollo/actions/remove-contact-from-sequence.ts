import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emailer_campaign_id: z.string().describe('Apollo sequence (emailer campaign) ID. Example: "66e9e215ece19801b219997f"'),
    contact_ids: z.array(z.string()).min(1).describe('Apollo contact IDs to remove or stop from the sequence. Example: ["66e34b81740c50074e3d1bd4"]'),
    action: z.enum(['remove', 'stop']).optional().describe('Action to perform on the contacts in the sequence. Defaults to remove.')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const ProviderEmailerCampaignSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    contacts: z.array(ProviderContactSchema).optional(),
    emailer_campaigns: z.array(ProviderEmailerCampaignSchema).optional()
});

const ContactOutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional()
});

const EmailerCampaignOutputSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const OutputSchema = z.object({
    contacts: z.array(ContactOutputSchema),
    emailer_campaigns: z.array(EmailerCampaignOutputSchema)
});

const action = createAction({
    description: 'Remove or stop one or more contacts from an Apollo sequence.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.apollo.io/reference/update-contact-status-sequence
            endpoint: '/v1/emailer_campaigns/remove_or_stop_contact_ids',
            data: {
                emailer_campaign_ids: [input.emailer_campaign_id],
                contact_ids: input.contact_ids,
                mode: input.action ?? 'remove'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            contacts: (providerResponse.contacts || []).map((contact) => ({
                id: contact.id,
                ...(contact.name != null && { name: contact.name }),
                ...(contact.email != null && { email: contact.email })
            })),
            emailer_campaigns: (providerResponse.emailer_campaigns || []).map((campaign) => ({
                id: campaign.id,
                ...(campaign.name != null && { name: campaign.name })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
