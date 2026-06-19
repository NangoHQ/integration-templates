import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    payment_id: z.string().describe('Customer payment ID. Example: "260815000000113012"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const InvoiceSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    date: z.string().optional(),
    invoice_amount: z.number().optional(),
    amount_applied: z.number().optional(),
    balance_amount: z.number().optional(),
    tax_amount_withheld: z.number().optional()
});

const TagSchema = z.object({
    tag_id: z.string().optional(),
    tag_name: z.string().optional(),
    tag_option_id: z.string().optional(),
    tag_option_name: z.string().optional(),
    is_tag_mandatory: z.boolean().optional()
});

const CustomFieldSchema = z.object({
    index: z.number().optional(),
    value: z.string().optional(),
    label: z.string().optional()
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string().optional(),
    payment_mode: z.string().optional(),
    amount: z.number().optional(),
    amount_refunded: z.number().optional(),
    bank_charges: z.number().optional(),
    date: z.string().optional(),
    status: z.string().optional(),
    reference_number: z.string().optional(),
    description: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    email: z.string().optional(),
    invoices: z.array(InvoiceSchema).optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    tags: z.array(TagSchema).optional(),
    custom_fields: z.array(CustomFieldSchema).optional()
});

const OutputSchema = ProviderPaymentSchema;

const action = createAction({
    description: 'Retrieve a single customer payment from Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.customerpayments.READ', 'ZohoBooks.settings.READ'],

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

        // https://www.zoho.com/books/api/v3/customerpayments/#get-a-payment
        const response = await nango.get({
            endpoint: `/books/v3/customerpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const WrapperSchema = z.object({
            code: z.number(),
            message: z.string(),
            payment: z.unknown().optional()
        });

        const data = WrapperSchema.parse(response.data);

        if (data.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: data.message,
                code: data.code
            });
        }

        const payment = ProviderPaymentSchema.parse(data.payment);
        return payment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
