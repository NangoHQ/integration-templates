import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const RecipientsSchema = z.object({
    listIds: z.array(z.number()).describe('IDs of the contact lists to send the SMS campaign to. Mandatory if scheduledAt is set. Example: [2, 36]'),
    exclusionListIds: z.array(z.number()).optional().describe('IDs of contact lists to exclude from the SMS campaign. Example: [7]')
});

const InputSchema = z
    .object({
        name: z.string().describe('Name of the SMS campaign. Example: "Spring Promo Code"'),
        sender: z.string().describe('Name of the sender. Limited to 11 alphanumeric characters or 15 numeric characters. Example: "MyShop"'),
        content: z
            .string()
            .describe(
                'Content of the SMS message. Content beyond 160 characters is sent (and billed) as multiple SMS. Example: "Get a discount by visiting our NY store and saying: Happy Spring!"'
            ),
        recipients: RecipientsSchema.optional().describe('Recipient lists for the campaign. listIds becomes mandatory if scheduledAt is set'),
        scheduledAt: z
            .string()
            .optional()
            .describe(
                'UTC date-time on which the campaign has to run, in YYYY-MM-DDTHH:mm:ss.SSSZ format. Prefer passing your timezone for accurate results. Example: "2026-12-31T10:00:00.000Z"'
            ),
        unicodeEnabled: z.boolean().optional().describe('Whether the message content should be treated as unicode. Default: false'),
        organisationPrefix: z
            .string()
            .optional()
            .describe(
                'Recognizable brand prefix added before the message content (recommended by U.S. carriers). Counts toward the 160-character SMS segment limit'
            ),
        unsubscribeInstruction: z
            .string()
            .optional()
            .describe(
                'Unsubscribe instructions appended after the message content (recommended by U.S. carriers). Must include the STOP keyword and counts toward the 160-character SMS segment limit'
            )
    })
    .describe('Details of the SMS campaign to create as a draft');

const CreateSmsCampaignResponseSchema = z.object({
    id: z.number()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created SMS campaign. Example: 5')
    })
    .describe('Confirmation of the created SMS campaign. Brevo returns only the new campaign ID');

/**
 * @tags: [write]
 * @tagReason: Creates a new SMS campaign in the provider account.
 * @pitfalls: Sender is limited to 11 alphanumeric or 15 numeric characters and content over 160 characters counts as more than one SMS. If scheduledAt is set, recipients.listIds becomes mandatory. Accounts under validation are limited to 4 total campaigns, and campaigns with more than 10 recipients are saved as draft.
 */
const action = createAction({
    description: 'Create a draft SMS campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.scheduledAt !== undefined && (!input.recipients || input.recipients.listIds.length === 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'recipients.listIds is required and must contain at least one list ID when scheduledAt is set.'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/create-sms-campaign
            endpoint: '/smsCampaigns',
            data: {
                name: input.name,
                sender: input.sender,
                content: input.content,
                ...(input.recipients !== undefined && { recipients: input.recipients }),
                ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
                ...(input.unicodeEnabled !== undefined && { unicodeEnabled: input.unicodeEnabled }),
                ...(input.organisationPrefix !== undefined && { organisationPrefix: input.organisationPrefix }),
                ...(input.unsubscribeInstruction !== undefined && { unsubscribeInstruction: input.unsubscribeInstruction })
            },
            // Creating a campaign is not idempotent: a retry after a lost response would create a duplicate campaign
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must be 0 for this non-idempotent create; the rule only accepts values > 0
            retries: 0
        };

        const response = await nango.post(config);

        const campaign = CreateSmsCampaignResponseSchema.parse(response.data);

        return {
            id: campaign.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
