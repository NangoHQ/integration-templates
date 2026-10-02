import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the email campaign. Example: "July Newsletter"'),
        subject: z.string().describe('Subject line of the campaign email. Required for a classic campaign without A/B testing.'),
        sender: z
            .object({
                name: z.string().describe('Display name recipients see as the sender. Example: "Acme Team"'),
                email: z.string().describe('Sender email address. Must belong to a verified sender on the Brevo account. Example: "news@acme.com"')
            })
            .describe('Sender of the campaign. The email must be a verified sender on the account.'),
        recipients: z
            .object({
                listIds: z
                    .array(z.number())
                    .describe('Numeric IDs of the contact lists to send the campaign to. Each list must contain at least one contact. Example: [2, 7]')
            })
            .describe('Recipient selection for the campaign. Omit to create a draft without recipients.'),
        htmlContent: z
            .string()
            .optional()
            .describe('Full HTML body of the campaign email. Required unless templateId is provided; cannot be used together with templateId.'),
        templateId: z
            .number()
            .optional()
            .describe(
                'ID of an active transactional email template to copy content from. Required unless htmlContent is provided; cannot be used together with templateId.'
            )
    })
    .describe('Input for creating a draft email campaign.');

const CreateCampaignResponseSchema = z.object({
    id: z.number()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Numeric ID of the newly created draft email campaign. Example: 5')
    })
    .describe('The created draft email campaign reference.');

/**
 * @tags: [write]
 * @tagReason: Creates a new draft email campaign on the provider account without reading or deleting anything.
 * @pitfalls: The sender email must be a verified sender on the account. Creation is rejected if a recipient list has zero members, and a list whose contacts were added moments earlier can still be rejected due to provider indexing lag, so allow a short delay or retry in that flow. htmlContent must be longer than 10 characters and under 1MB.
 */
const action = createAction({
    description: 'Create a draft email (classic) campaign',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.htmlContent === undefined && input.templateId === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either htmlContent or templateId must be provided.'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/create-email-campaign
            endpoint: '/emailCampaigns',
            data: {
                name: input.name,
                subject: input.subject,
                sender: {
                    name: input.sender.name,
                    email: input.sender.email
                },
                ...(input.recipients !== undefined && {
                    recipients: {
                        listIds: input.recipients.listIds
                    }
                }),
                ...(input.htmlContent !== undefined && { htmlContent: input.htmlContent }),
                ...(input.templateId !== undefined && { templateId: input.templateId })
            },
            // Non-idempotent create: retrying after a lost response would create a duplicate campaign.
            retries: 10
        };

        const response = await nango.post(config);
        const created = CreateCampaignResponseSchema.parse(response.data);

        return { id: created.id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
