import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the marketing email. Example: "Newsletter March 2024"'),
    subject: z.string().describe('The subject line of the email. Example: "Check out our latest updates!"'),
    htmlBody: z.string().optional().describe('The HTML content of the email body.'),
    textBody: z.string().optional().describe('The plain text content of the email body.'),
    fromName: z.string().optional().describe('The display name for the email sender.'),
    fromEmail: z.string().optional().describe('The email address of the sender.'),
    templatePath: z.string().optional().describe('The path to a HubSpot template. Example: "@hubspot/email/dnd/welcome.html"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    subject: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    state: z.string().optional(),
    campaignId: z.string().optional(),
    contentId: z.string().optional()
});

const action = createAction({
    description: 'Create a marketing email in HubSpot',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-marketing-email',
        group: 'Marketing Emails'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['content', 'crm.objects.contacts.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the request body for HubSpot Marketing Email API
        // https://developers.hubspot.com/docs/api-reference/marketing-marketing-emails-v3/marketing-emails/post-marketing-v3-emails
        const requestBody: any = {
            name: input.name,
            subject: input.subject
        };

        // Add optional content if provided
        if (input.htmlBody || input.textBody) {
            requestBody['content'] = {};

            if (input.htmlBody) {
                requestBody['content']['widgets'] = {
                    'module-0-0-1': {
                        body: {
                            html: input.htmlBody
                        }
                    }
                };
            }

            if (input.textBody) {
                requestBody['content']['widgets'] = requestBody['content']['widgets'] || {};
                requestBody['content']['widgets']['module-0-0-1'] = {
                    ...requestBody['content']['widgets']['module-0-0-1'],
                    body: {
                        ...requestBody['content']['widgets']['module-0-0-1']?.body,
                        text: input.textBody
                    }
                };
            }
        }

        // Add sender information if provided
        if (input.fromName) {
            requestBody['fromName'] = input.fromName;
        }

        if (input.fromEmail) {
            requestBody['fromEmail'] = input.fromEmail;
        }

        // Add template path if provided
        if (input.templatePath) {
            requestBody['templatePath'] = input.templatePath;
        }

        const response = await nango.post({
            endpoint: '/marketing/v3/emails',
            data: requestBody,
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            name: data.name ?? undefined,
            subject: data.subject ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined,
            state: data.state ?? undefined,
            campaignId: data.campaignId ?? undefined,
            contentId: data.contentId ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
