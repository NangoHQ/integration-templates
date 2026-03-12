import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the marketing email. Example: "Newsletter March 2024"'),
    subject: z.string().describe('The subject line of the email. Example: "Check out our latest updates!"'),
    html_body: z.string().optional().describe('The HTML content of the email body.'),
    text_body: z.string().optional().describe('The plain text content of the email body.'),
    from_name: z.string().optional().describe('The display name for the email sender.'),
    from_email: z.string().optional().describe('The email address of the sender.'),
    template_path: z.string().optional().describe('The path to a HubSpot template. Example: "@hubspot/email/dnd/welcome.html"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    subject: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()]),
    campaign_id: z.union([z.string(), z.null()]),
    content_id: z.union([z.string(), z.null()])
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
        if (input.html_body || input.text_body) {
            requestBody['content'] = {};

            if (input.html_body) {
                requestBody['content']['widgets'] = {
                    'module-0-0-1': {
                        body: {
                            html: input.html_body
                        }
                    }
                };
            }

            if (input.text_body) {
                requestBody['content']['widgets'] = requestBody['content']['widgets'] || {};
                requestBody['content']['widgets']['module-0-0-1'] = {
                    ...requestBody['content']['widgets']['module-0-0-1'],
                    body: {
                        ...requestBody['content']['widgets']['module-0-0-1']?.body,
                        text: input.text_body
                    }
                };
            }
        }

        // Add sender information if provided
        if (input.from_name) {
            requestBody['fromName'] = input.from_name;
        }

        if (input.from_email) {
            requestBody['fromEmail'] = input.from_email;
        }

        // Add template path if provided
        if (input.template_path) {
            requestBody['templatePath'] = input.template_path;
        }

        const response = await nango.post({
            endpoint: '/marketing/v3/emails',
            data: requestBody,
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            name: data.name ?? null,
            subject: data.subject ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null,
            state: data.state ?? null,
            campaign_id: data.campaignId ?? null,
            content_id: data.contentId ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
