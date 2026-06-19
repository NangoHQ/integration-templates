import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const LineItemSchema = z.object({
    item_id: z.string().optional().describe('Item ID. Example: "260815000000100002"'),
    account_id: z.string().optional().describe('Account ID for custom line items. Example: "260815000000000388"'),
    description: z.string().optional(),
    quantity: z.number().optional(),
    rate: z.number().optional(),
    tax_id: z.string().optional()
});

const InputSchema = z.object({
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    customer_id: z.string().describe('Customer ID. Example: "260815000000097001"'),
    date: z.string().describe('Credit note date. Example: "2026-06-09"'),
    line_items: z.array(LineItemSchema).describe('Line items for the credit note'),
    creditnote_number: z.string().optional().describe('Credit note number. Example: "CN-00003"'),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    terms: z.string().optional()
});

const ProviderCreditNoteSchema = z
    .object({
        creditnote_id: z.string(),
        creditnote_number: z.string().optional(),
        customer_id: z.string().optional(),
        date: z.string().optional(),
        total: z.number().optional(),
        status: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    creditnote_number: z.string().optional(),
    customer_id: z.string().optional(),
    date: z.string().optional(),
    total: z.number().optional(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Create a credit note in Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.creditnotes.CREATE', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
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

        const response = await nango.post({
            // https://www.zoho.com/books/api/v3/credit-notes/#create-a-credit-note
            endpoint: '/books/v3/creditnotes',
            params: {
                organization_id: organizationId
            },
            data: {
                customer_id: input.customer_id,
                date: input.date,
                line_items: input.line_items,
                ...(input.creditnote_number !== undefined && { creditnote_number: input.creditnote_number }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.terms !== undefined && { terms: input.terms })
            },
            retries: 3
        });

        const parsed = z
            .object({
                creditnote: ProviderCreditNoteSchema
            })
            .parse(response.data);

        return {
            id: parsed.creditnote.creditnote_id,
            ...(parsed.creditnote.creditnote_number !== undefined && { creditnote_number: parsed.creditnote.creditnote_number }),
            ...(parsed.creditnote.customer_id !== undefined && { customer_id: parsed.creditnote.customer_id }),
            ...(parsed.creditnote.date !== undefined && { date: parsed.creditnote.date }),
            ...(parsed.creditnote.total !== undefined && { total: parsed.creditnote.total }),
            ...(parsed.creditnote.status !== undefined && { status: parsed.creditnote.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
