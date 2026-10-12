import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        estimate_id: z.string().describe('Unique identifier of the estimate to retrieve. Example: "260815000000116017"'),
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID. Required: every Zoho Invoice endpoint needs it and this connection cannot look it up, because listing organizations requires a settings scope this connection does not hold.'
            )
    })
    .describe('Input for retrieving a single Zoho Invoice estimate.');

const AddressSchema = z
    .object({
        address: z.string().optional().describe('Street address line.'),
        street2: z.string().optional().describe('Second line of the street address.'),
        city: z.string().optional().describe('City.'),
        state: z.string().optional().describe('State or province.'),
        zip: z.union([z.string(), z.number()]).optional().describe('Postal or ZIP code.'),
        country: z.string().optional().describe('Country.'),
        fax: z.union([z.string(), z.number()]).optional().describe('Fax number.'),
        phone: z.string().optional().describe('Phone number.'),
        attention: z.string().optional().describe('Attention line.')
    })
    .passthrough();

const TaxSchema = z
    .object({
        tax_name: z.string().optional().describe('Name of the tax.'),
        tax_amount: z.number().optional().describe('Amount of tax levied.')
    })
    .passthrough();

const CustomFieldSchema = z
    .object({
        customfield_id: z.union([z.string(), z.number()]).optional().describe('Unique ID of the custom field.'),
        data_type: z.string().optional().describe('Data type of the custom field.'),
        index: z.number().optional().describe('Ordering index of the custom field.'),
        label: z.string().optional().describe('Display label of the custom field.'),
        show_on_pdf: z.boolean().optional().describe('Whether the custom field is shown on the estimate PDF.'),
        show_in_all_pdf: z.boolean().optional().describe('Whether the custom field is shown on all PDFs.'),
        value: z.string().optional().describe('Value of the custom field.')
    })
    .passthrough();

const ContactPersonSchema = z
    .object({
        contact_person_id: z.union([z.string(), z.number()]).optional().describe('Unique ID of the contact person.'),
        contact_person_name: z.string().optional().describe('Full name of the contact person.'),
        first_name: z.string().optional().describe('First name of the contact person.'),
        last_name: z.string().optional().describe('Last name of the contact person.'),
        contact_person_email: z.string().optional().describe('Email address of the contact person.'),
        phone: z.string().optional().describe('Phone number of the contact person.'),
        mobile: z.string().optional().describe('Mobile number of the contact person.')
    })
    .passthrough();

const ProjectSchema = z
    .object({
        project_id: z.union([z.string(), z.number()]).optional().describe('Unique ID of the project.'),
        project_name: z.string().optional().describe('Name of the project.')
    })
    .passthrough();

const LineItemSchema = z
    .object({
        item_id: z.union([z.string(), z.number()]).optional().describe('Unique ID of the catalog item, when the line was created from an item.'),
        line_item_id: z.union([z.string(), z.number()]).optional().describe('Unique ID of the line item.'),
        name: z.string().optional().describe('Name of the line item.'),
        description: z.string().optional().describe('Description of the line item.'),
        item_order: z.number().optional().describe('Position of the line item within the estimate.'),
        bcy_rate: z.number().optional().describe('Rate of the line item in the organization base currency.'),
        rate: z.number().optional().describe('Rate of the line item.'),
        quantity: z.number().optional().describe('Quantity of the line item.'),
        unit: z.string().optional().describe('Unit of measure (e.g. "kgs", "Nos").'),
        discount_amount: z.number().optional().describe('Discount amount applied to the line item.'),
        discount: z.number().optional().describe('Discount applied to the line item.'),
        tax_id: z.union([z.string(), z.number()]).optional().describe('ID of the tax or tax group applied to the line item.'),
        tax_name: z.string().optional().describe('Name of the tax applied to the line item.'),
        tax_type: z.string().optional().describe('Type of the tax applied to the line item.'),
        tax_percentage: z.number().optional().describe('Tax percentage levied on the line item.'),
        item_total: z.number().optional().describe('Total amount for the line item.'),
        line_item_taxes: z.array(TaxSchema).optional().describe('Taxes applied to the line item.')
    })
    .passthrough();

const EstimateSchema = z
    .object({
        estimate_id: z.union([z.string(), z.number()]).describe('Unique identifier of the estimate.'),
        estimate_number: z.string().optional().describe('Human-readable estimate number. Example: "QT-000006"'),
        date: z.string().optional().describe('Estimate date in YYYY-MM-DD format.'),
        created_date: z.string().optional().describe('Date the estimate was created in YYYY-MM-DD format.'),
        reference_number: z.string().optional().describe('Transaction reference number.'),
        status: z.string().optional().describe('Current status of the estimate: draft, sent, accepted, declined, invoiced or expired.'),
        current_sub_status: z.string().optional().describe('Current sub-status of the estimate.'),
        customer_id: z.union([z.string(), z.number()]).optional().describe('ID of the customer the estimate is for.'),
        customer_name: z.string().optional().describe('Name of the customer the estimate is for.'),
        contact_persons_associated: z.array(ContactPersonSchema).optional().describe('Contact persons associated with the estimate.'),
        currency_id: z.union([z.string(), z.number()]).optional().describe('Unique ID of the currency used by the estimate.'),
        currency_code: z.string().optional().describe('Currency code. Example: "USD"'),
        currency_symbol: z.string().optional().describe('Currency symbol. Example: "$"'),
        exchange_rate: z.number().optional().describe('Foreign exchange rate of the currency.'),
        expiry_date: z.string().optional().describe('Expiry date of the estimate in YYYY-MM-DD format.'),
        discount: z.number().optional().describe('Discount applied to the estimate.'),
        is_discount_before_tax: z.boolean().optional().describe('Whether the discount is applied before tax.'),
        discount_type: z.string().optional().describe('How the discount is specified: entity_level or item_level.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether the line item rates are inclusive of tax.'),
        is_viewed_by_client: z.boolean().optional().describe('Whether the customer has viewed the estimate.'),
        client_viewed_time: z.string().optional().describe('Time the customer last viewed the estimate.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items of the estimate.'),
        sub_total: z.number().optional().describe('Subtotal of all line items before tax.'),
        total: z.number().optional().describe('Total value of the estimate.'),
        tax_total: z.number().optional().describe('Total tax levied on the estimate.'),
        shipping_charge: z.union([z.string(), z.number()]).optional().describe('Shipping charges applied to the estimate.'),
        adjustment: z.number().optional().describe('Adjustment made to the estimate.'),
        adjustment_description: z.string().optional().describe('Description of the adjustment.'),
        roundoff_value: z.number().optional().describe('Rounding-off value applied to the estimate.'),
        taxes: z.array(TaxSchema).optional().describe('Taxes levied on the estimate.'),
        billing_address: AddressSchema.optional().describe('Billing address of the customer.'),
        shipping_address: AddressSchema.optional().describe('Shipping address of the customer.'),
        notes: z.string().optional().describe('Notes shown at the bottom of the estimate.'),
        terms: z.string().optional().describe('Terms and conditions of the estimate.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields for the estimate.'),
        template_id: z.union([z.string(), z.number()]).optional().describe('ID of the template used for the estimate.'),
        template_name: z.string().optional().describe('Name of the template used for the estimate.'),
        created_time: z.string().optional().describe('Time the estimate was created.'),
        last_modified_time: z.string().optional().describe('Time the estimate was last modified.'),
        salesperson_id: z.union([z.string(), z.number()]).optional().describe('Unique ID of the sales person.'),
        salesperson_name: z.string().optional().describe('Name of the sales person.'),
        project: ProjectSchema.optional().describe('Project associated with the estimate.'),
        estimate_url: z.string().optional().describe('Customer-facing URL of the estimate.'),
        estimate_type: z.string().optional().describe('Type of the estimate.')
    })
    .passthrough();

const OutputSchema = EstimateSchema.describe('A single Zoho Invoice estimate, including its line items and current status.');

/**
 * @tags: [read]
 * @tagReason: Reads a single estimate and its line items from the provider without changing any data.
 * @pitfalls: organization_id must be supplied by the caller because this connection cannot discover it automatically, and omitting it fails with an authorization-style error; requesting an unknown or deleted estimate returns a not-found error instead of an empty result.
 */
const action = createAction({
    description: 'Get a single estimate by ID, including line items and current status.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.estimates.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/estimates/#get-an-estimate
            endpoint: `/invoice/v3/estimates/${encodeURIComponent(input.estimate_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho Invoice API.'
            });
        }

        const WrapperSchema = z.object({
            code: z.number().optional(),
            message: z.string().optional(),
            estimate: z.unknown()
        });

        const wrapper = WrapperSchema.parse(response.data);
        const estimateData = wrapper.estimate;

        if (!estimateData || typeof estimateData !== 'object' || Array.isArray(estimateData)) {
            throw new nango.ActionError({
                type: 'estimate_not_found',
                message: 'Estimate not found in the response.',
                estimate_id: input.estimate_id
            });
        }

        return EstimateSchema.parse(estimateData);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
