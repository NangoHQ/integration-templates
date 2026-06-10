import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the invoice to email. Example: "260815000000103001"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    to_mail_ids: z.array(z.string()).optional().describe('List of recipient email addresses.'),
    cc_mail_ids: z.array(z.string()).optional().describe('List of CC email addresses.'),
    subject: z.string().optional().describe('Subject of the email.'),
    body: z.string().optional().describe('Body content of the email.'),
    send_customer_statement: z.boolean().optional().describe('Whether to include the customer statement.'),
    attachments: z.string().optional().describe('Comma-separated IDs of file attachments to include.')
});

const ProviderResponseSchema = z
    .object({
        code: z.number().optional(),
        message: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Email a Zoho Books invoice.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/send-invoice-email',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.invoices.CREATE', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0 || !orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const data: Record<string, unknown> = {};
        if (input.to_mail_ids !== undefined && input.to_mail_ids.length > 0) {
            data['to_mail_ids'] = input.to_mail_ids;
        }
        if (input.cc_mail_ids !== undefined && input.cc_mail_ids.length > 0) {
            data['cc_mail_ids'] = input.cc_mail_ids;
        }
        if (input.subject !== undefined) {
            data['subject'] = input.subject;
        }
        if (input.body !== undefined) {
            data['body'] = input.body;
        }
        if (input.send_customer_statement !== undefined) {
            data['send_customer_statement'] = input.send_customer_statement;
        }
        if (input.attachments !== undefined) {
            data['attachments'] = input.attachments;
        }

        // https://www.zoho.com/books/api/v3/invoices/#email-an-invoice
        const response = await nango.post({
            endpoint: `/books/v3/invoices/${encodeURIComponent(input.invoice_id)}/email`,
            params: {
                organization_id: organizationId
            },
            data,
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse provider response.'
            });
        }

        return {
            ...(providerResponse.data.code !== undefined && { code: providerResponse.data.code }),
            ...(providerResponse.data.message !== undefined && { message: providerResponse.data.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
