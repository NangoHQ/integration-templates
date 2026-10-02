import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the email campaign to create. Example: "April Product Newsletter".'),
        subject: z.string().describe('Subject line of the campaign email. Example: "New features this month".'),
        sender: z
            .object({
                email: z
                    .string()
                    .describe('Sender email address. Must be an existing verified sender in the Brevo account. Example: "newsletter@example.com".'),
                name: z.string().optional().describe('Optional sender display name shown to recipients. Example: "Acme Newsletter".')
            })
            .describe('Sender details. The email must belong to a sender that already exists and is verified in the Brevo account.'),
        htmlContent: z.string().describe('HTML body of the campaign email. Must be more than 10 characters and less than 1MB in size.'),
        listIds: z.array(z.number().int()).min(1).describe('Numeric IDs of the Brevo contact lists the campaign is sent to. Example: [2, 7].')
    })
    .describe('Details of the classic email campaign to create and send immediately.');

const CampaignStatusSchema = z.enum(['draft', 'sent', 'archive', 'queued', 'suspended', 'in_process', 'in_review', 'cancelling', 'cancelled']);

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created email campaign.'),
        status: CampaignStatusSchema.describe('Status of the campaign after the immediate send was requested, e.g. "sent" or "queued".')
    })
    .describe('Result of the created and immediately sent email campaign.');

const CreateCampaignResponseSchema = z.object({
    id: z.number()
});

const GetCampaignResponseSchema = z.object({
    id: z.number(),
    status: CampaignStatusSchema
});

/**
 * @tags: [read, write, destructive]
 * @tagReason: Creates an email campaign and dispatches it immediately to real recipients (write); the send is irreversible real-world email delivery and the campaign becomes permanently undeletable once sent (destructive); the campaign is then read back to report its final status (read).
 * @pitfalls: Sending is irreversible: once a campaign is sent or scheduled it can never be deleted via the API, so every successful call leaves a permanent campaign in the account. A successful call returns as soon as the send is queued, so the returned status is typically "queued" rather than "sent". The sender email must already be a verified sender in the Brevo account. A list created moments earlier with freshly added contacts may be rejected as having no associated contacts due to recipient indexing lag; retry after a short delay.
 */
const action = createAction({
    description: 'Create a classic email campaign and send it immediately to the given contact lists in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/create-email-campaign
            endpoint: '/emailCampaigns',
            data: {
                name: input.name,
                subject: input.subject,
                sender: {
                    email: input.sender.email,
                    ...(input.sender.name !== undefined && { name: input.sender.name })
                },
                htmlContent: input.htmlContent,
                recipients: {
                    listIds: input.listIds
                }
            },
            // Campaign creation is not idempotent and has no idempotency key: retrying after a lost response would create a duplicate campaign.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        const createResponse = await nango.post(createConfig);
        const created = CreateCampaignResponseSchema.parse(createResponse.data);

        const sendConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/send-email-campaign-now
            endpoint: `/emailCampaigns/${encodeURIComponent(created.id)}/sendNow`,
            // Dispatching the campaign is not idempotent: a retry after a lost response would attempt to send it again.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        await nango.post(sendConfig);

        const getConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-email-campaign
            endpoint: `/emailCampaigns/${encodeURIComponent(created.id)}`,
            retries: 3
        };
        const campaignResponse = await nango.get(getConfig);
        const campaign = GetCampaignResponseSchema.parse(campaignResponse.data);

        return {
            id: campaign.id,
            status: campaign.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
