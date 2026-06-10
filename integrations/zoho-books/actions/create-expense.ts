import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    account_id: z.string().describe('ID of the expense account. Example: "260815000000000388"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    date: z.string().describe('Date of the expense in YYYY-MM-DD format. Example: "2026-06-09"'),
    amount: z.number().describe('Amount of the expense. Example: 50.00'),
    paid_through_account_id: z.string().describe('ID of the account through which the expense is paid. Example: "260815000000102017"'),
    tax_id: z.string().optional().describe('Unique identifier of the tax. Example: "260815000000000097"'),
    description: z.string().optional().describe('Description of the expense. Max-length [100]'),
    reference_number: z.string().optional().describe('Reference number of the expense. Max-length [100]'),
    customer_id: z.string().optional().describe('ID of the customer to bill the expense to. Example: "260815000000097001"'),
    vendor_id: z.string().optional().describe('ID of the vendor the expense is made to. Example: "260815000000098001"'),
    currency_id: z.string().optional().describe('Unique identifier of the currency. Example: "260815000000000097"'),
    exchange_rate: z.number().optional().describe('Exchange rate of the currency with respect to the base currency.'),
    project_id: z.string().optional().describe('ID of the project associated with the customer.'),
    is_billable: z.boolean().optional().describe('Whether the expense is billable to the customer.'),
    is_inclusive_tax: z.boolean().optional().describe('Whether the tax is inclusive in the amount.'),
    line_items: z
        .array(
            z.object({
                line_item_id: z.string().optional().describe('Unique identifier of the line item.'),
                account_id: z.string().describe('ID of the expense account for this line item.'),
                description: z.string().optional().describe('Description of the line item. Max-length [100]'),
                amount: z.number().describe('Amount of the line item.'),
                tax_id: z.string().optional().describe('Unique identifier of the tax for this line item.'),
                item_order: z.number().optional().describe('Order of the line item in the expense.'),
                product_type: z.string().optional().describe('Type of the expense.'),
                reverse_charge_tax_id: z.string().optional().describe('ID of the reverse charge tax.'),
                tax_exemption_code: z.string().optional().describe('Tax exemption code.'),
                tax_exemption_id: z.string().optional().describe('Tax exemption ID.'),
                location_id: z.string().optional().describe('Location ID.'),
                tags: z
                    .array(
                        z.object({
                            tag_id: z.string().optional().describe('Tag ID.'),
                            tag_name: z.string().optional().describe('Tag Name.'),
                            tag_option_id: z.string().optional().describe('Tag Option ID.'),
                            tag_option_name: z.string().optional().describe('Tag Option Name.'),
                            is_tag_mandatory: z.boolean().optional().describe('Whether the tag is mandatory.')
                        })
                    )
                    .optional()
                    .describe('Reporting tags for the line item.')
            })
        )
        .optional()
        .describe('Line items for the expense.'),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string().optional().describe('Unique identifier of the Custom Field.'),
                value: z.string().optional().describe('Value of the Custom Field.')
            })
        )
        .optional()
        .describe('Custom fields for the expense.'),
    tags: z
        .array(
            z.object({
                tag_id: z.string().optional().describe('Tag ID.'),
                tag_option_id: z.string().optional().describe('Tag Option ID.')
            })
        )
        .optional()
        .describe('Reporting tags for the expense.')
});

const LineItemSchema = z.object({
    line_item_id: z.string().optional(),
    account_id: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().optional(),
    tax_id: z.string().optional(),
    item_order: z.number().optional(),
    product_type: z.string().optional(),
    reverse_charge_tax_id: z.string().optional(),
    tax_exemption_code: z.string().optional(),
    tax_exemption_id: z.string().optional(),
    location_id: z.string().optional(),
    tags: z
        .array(
            z.object({
                tag_id: z.string().optional(),
                tag_name: z.string().optional(),
                tag_option_id: z.string().optional(),
                tag_option_name: z.string().optional(),
                is_tag_mandatory: z.boolean().optional()
            })
        )
        .optional()
});

const TagSchema = z.object({
    tag_id: z.string().optional(),
    tag_name: z.string().optional(),
    tag_option_id: z.string().optional(),
    tag_option_name: z.string().optional(),
    is_tag_mandatory: z.boolean().optional()
});

const ProviderExpenseSchema = z.object({
    expense_id: z.string().optional(),
    transaction_id: z.string().optional(),
    transaction_type: z.string().optional(),
    gst_no: z.string().optional(),
    gst_treatment: z.string().optional(),
    tax_treatment: z.string().optional(),
    destination_of_supply: z.string().optional(),
    destination_of_supply_state: z.string().optional(),
    place_of_supply: z.string().optional(),
    hsn_or_sac: z.string().optional(),
    source_of_supply: z.string().optional(),
    paid_through_account_id: z.string().optional(),
    paid_through_account_name: z.string().optional(),
    vat_reg_no: z.string().optional(),
    reverse_charge_tax_id: z.string().optional(),
    reverse_charge_tax_name: z.string().optional(),
    reverse_charge_tax_percentage: z.number().optional(),
    reverse_charge_tax_amount: z.number().optional(),
    tax_amount: z.number().optional(),
    is_itemized_expense: z.boolean().optional(),
    is_pre_gst: z.string().optional(),
    trip_id: z.string().optional(),
    trip_number: z.string().optional(),
    reverse_charge_vat_total: z.number().optional(),
    acquisition_vat_total: z.number().optional(),
    acquisition_vat_summary: z
        .array(z.object({ tax: z.object({ tax_name: z.string().optional(), tax_amount: z.number().optional() }).optional() }).optional())
        .optional(),
    reverse_charge_vat_summary: z
        .array(z.object({ tax: z.object({ tax_name: z.string().optional(), tax_amount: z.number().optional() }).optional() }).optional())
        .optional(),
    taxes: z.array(z.object({ tax_id: z.string().optional(), tax_amount: z.number().optional() }).optional()).optional(),
    expense_item_id: z.string().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    date: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.number().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    sub_total: z.number().optional(),
    total: z.number().optional(),
    bcy_total: z.number().optional(),
    amount: z.number().optional(),
    is_inclusive_tax: z.boolean().optional(),
    reference_number: z.string().optional(),
    description: z.string().optional(),
    is_billable: z.boolean().optional(),
    is_personal: z.boolean().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    expense_receipt_name: z.string().optional(),
    expense_receipt_type: z.string().optional(),
    last_modified_time: z.string().optional(),
    status: z.string().optional(),
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    project_id: z.string().optional(),
    project_name: z.string().optional(),
    mileage_rate: z.number().optional(),
    mileage_type: z.string().optional(),
    expense_type: z.string().optional(),
    start_reading: z.string().optional(),
    end_reading: z.string().optional(),
    tags: z.array(TagSchema).optional(),
    line_items: z.array(LineItemSchema).optional(),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string().optional(),
                value: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    expense_id: z.string().optional().describe('Unique identifier of the created expense.'),
    account_id: z.string().optional().describe('ID of the expense account.'),
    date: z.string().optional().describe('Date of the expense.'),
    amount: z.number().optional().describe('Amount of the expense.'),
    description: z.string().optional().describe('Description of the expense.'),
    reference_number: z.string().optional().describe('Reference number of the expense.'),
    customer_id: z.string().optional().describe('ID of the customer.'),
    vendor_id: z.string().optional().describe('ID of the vendor.'),
    currency_id: z.string().optional().describe('ID of the currency.'),
    exchange_rate: z.number().optional().describe('Exchange rate of the currency.'),
    project_id: z.string().optional().describe('ID of the project.'),
    is_billable: z.boolean().optional().describe('Whether the expense is billable.'),
    is_inclusive_tax: z.boolean().optional().describe('Whether the tax is inclusive.'),
    status: z.string().optional().describe('Status of the expense.'),
    tax_amount: z.number().optional().describe('Tax amount for the expense.'),
    total: z.number().optional().describe('Total amount of the expense.'),
    sub_total: z.number().optional().describe('Sub total of the expense.'),
    bcy_total: z.number().optional().describe('Base currency total.'),
    tax_id: z.string().optional().describe('ID of the tax.'),
    tax_name: z.string().optional().describe('Name of the tax.'),
    tax_percentage: z.number().optional().describe('Tax percentage.'),
    paid_through_account_id: z.string().optional().describe('ID of the paid through account.'),
    paid_through_account_name: z.string().optional().describe('Name of the paid through account.'),
    line_items: z.array(LineItemSchema).optional().describe('Line items of the expense.'),
    tags: z.array(TagSchema).optional().describe('Tags of the expense.'),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string().optional().describe('ID of the custom field.'),
                value: z.string().optional().describe('Value of the custom field.')
            })
        )
        .optional()
        .describe('Custom fields of the expense.')
});

const action = createAction({
    description: 'Create an expense in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-expense',
        group: 'Expenses'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.expenses.CREATE', 'ZohoBooks.settings.READ'],

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

        const response = await nango.post({
            // https://www.zoho.com/books/api/v3/expenses/#create-an-expense
            endpoint: '/books/v3/expenses',
            params: {
                organization_id: organizationId
            },
            data: {
                account_id: input.account_id,
                date: input.date,
                amount: input.amount,
                paid_through_account_id: input.paid_through_account_id,
                ...(input.tax_id !== undefined && { tax_id: input.tax_id }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
                ...(input.vendor_id !== undefined && { vendor_id: input.vendor_id }),
                ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
                ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.is_billable !== undefined && { is_billable: input.is_billable }),
                ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax }),
                ...(input.line_items !== undefined && { line_items: input.line_items }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
                ...(input.tags !== undefined && { tags: input.tags })
            },
            retries: 10
        });

        if (response.status !== 200 && response.status !== 201) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Zoho Books API returned status ${response.status}`,
                details: response.data
            });
        }

        const providerResponse = z
            .object({
                code: z.number(),
                message: z.string().optional(),
                expense: ProviderExpenseSchema.optional()
            })
            .parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerResponse.message || 'Unknown error from Zoho Books API',
                code: providerResponse.code
            });
        }

        const expense = providerResponse.expense;

        if (!expense) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Expense not found in response'
            });
        }

        return {
            expense_id: expense.expense_id,
            account_id: expense.account_id,
            date: expense.date,
            amount: expense.amount,
            description: expense.description,
            reference_number: expense.reference_number,
            customer_id: expense.customer_id,
            vendor_id: expense.vendor_id,
            currency_id: expense.currency_id,
            exchange_rate: expense.exchange_rate,
            project_id: expense.project_id,
            is_billable: expense.is_billable,
            is_inclusive_tax: expense.is_inclusive_tax,
            status: expense.status,
            tax_amount: expense.tax_amount,
            total: expense.total,
            sub_total: expense.sub_total,
            bcy_total: expense.bcy_total,
            tax_id: expense.tax_id,
            tax_name: expense.tax_name,
            tax_percentage: expense.tax_percentage,
            paid_through_account_id: expense.paid_through_account_id,
            paid_through_account_name: expense.paid_through_account_name,
            line_items: expense.line_items,
            tags: expense.tags,
            custom_fields: expense.custom_fields
                ? expense.custom_fields.map((cf) => ({
                      customfield_id: cf.customfield_id,
                      value: cf.value
                  }))
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
