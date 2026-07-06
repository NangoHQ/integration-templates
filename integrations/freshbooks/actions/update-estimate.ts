import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account identifier. Example: "ZyQ04o"')
});

const MoneySchema = z.object({
    amount: z.string(),
    code: z.string()
});

const EstimateLineInputSchema = z.object({
    type: z.number().optional(),
    qty: z.number().optional(),
    unit_cost: MoneySchema.optional(),
    description: z.string().optional(),
    name: z.string().optional(),
    taxName1: z.string().optional(),
    taxAmount1: z.number().optional(),
    taxName2: z.string().optional(),
    taxAmount2: z.number().optional(),
    expenseid: z.number().optional()
});

const InputSchema = z.object({
    estimateId: z.number().describe('The ID of the estimate to update. Example: 2201278'),
    customerid: z.number().optional(),
    create_date: z.string().optional(),
    description: z.string().optional(),
    terms: z.string().nullable().optional(),
    notes: z.string().optional(),
    po_number: z.string().nullable().optional(),
    currency_code: z.string().optional(),
    language: z.string().optional(),
    discount_value: z.string().optional(),
    template: z.string().optional(),
    street: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    code: z.string().optional(),
    country: z.string().optional(),
    organization: z.string().optional(),
    fname: z.string().optional(),
    lname: z.string().optional(),
    vat_name: z.string().optional(),
    vat_number: z.string().optional(),
    lines: z.array(EstimateLineInputSchema).optional()
});

const EstimateLineSchema = z.object({
    lineid: z.number().optional(),
    amount: MoneySchema.optional(),
    updated: z.string().optional(),
    type: z.number().optional(),
    qty: z.number().optional(),
    unit_cost: MoneySchema.optional(),
    description: z.string().optional(),
    name: z.string().optional(),
    taxName1: z.string().optional(),
    taxAmount1: z.number().optional(),
    taxName2: z.string().optional(),
    taxAmount2: z.number().optional(),
    expenseid: z.number().optional()
});

const ProviderEstimateSchema = z.object({
    status: z.number(),
    create_date: z.string(),
    code: z.string(),
    ownerid: z.number(),
    vat_number: z.string(),
    id: z.number(),
    vat_name: z.string().nullable().optional(),
    ui_status: z.string(),
    invoiced: z.boolean(),
    reply_status: z.string().nullable().optional(),
    country: z.string(),
    lname: z.string(),
    estimateid: z.number(),
    ext_archive: z.number(),
    template: z.string(),
    vis_state: z.number(),
    current_organization: z.string(),
    province: z.string(),
    updated: z.string(),
    terms: z.string().nullable().optional(),
    description: z.string(),
    street2: z.string(),
    discount_total: MoneySchema,
    address: z.string(),
    estimate_number: z.string(),
    customerid: z.number(),
    discount_value: z.string(),
    accounting_systemid: z.string(),
    organization: z.string(),
    language: z.string(),
    po_number: z.string().nullable().optional(),
    display_status: z.string(),
    notes: z.string(),
    amount: MoneySchema,
    street: z.string(),
    city: z.string(),
    currency_code: z.string(),
    sentid: z.number(),
    fname: z.string(),
    created_at: z.string(),
    accountid: z.string().optional(),
    lines: z.array(EstimateLineSchema).optional()
});

const ResponseSchema = z.object({
    response: z.object({
        result: z.object({
            estimate: ProviderEstimateSchema
        })
    })
});

const OutputSchema = z.object({
    id: z.number(),
    status: z.number(),
    create_date: z.string(),
    customerid: z.number(),
    estimate_number: z.string(),
    amount: MoneySchema,
    currency_code: z.string(),
    description: z.string().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    po_number: z.string().optional(),
    discount_value: z.string().optional(),
    discount_total: MoneySchema.optional(),
    template: z.string().optional(),
    language: z.string().optional(),
    vis_state: z.number().optional(),
    invoiced: z.boolean().optional(),
    ui_status: z.string().optional(),
    display_status: z.string().optional(),
    organization: z.string().optional(),
    fname: z.string().optional(),
    lname: z.string().optional(),
    street: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
    code: z.string().optional(),
    vat_name: z.string().nullable().optional(),
    vat_number: z.string().optional(),
    updated: z.string().optional(),
    created_at: z.string().optional(),
    lines: z.array(EstimateLineSchema).optional()
});

const action = createAction({
    description: 'Update an estimate.',
    version: '1.0.0',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:estimates:write'],

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata<{ accountId?: string }>();
        const accountId = metadata?.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'accountId is required in connection metadata. Run get-account-id first.'
            });
        }

        const body = {
            estimate: {
                ...(input.customerid !== undefined && { customerid: input.customerid }),
                ...(input.create_date !== undefined && { create_date: input.create_date }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.terms !== undefined && { terms: input.terms }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.po_number !== undefined && { po_number: input.po_number }),
                ...(input.currency_code !== undefined && { currency_code: input.currency_code }),
                ...(input.language !== undefined && { language: input.language }),
                ...(input.discount_value !== undefined && { discount_value: input.discount_value }),
                ...(input.template !== undefined && { template: input.template }),
                ...(input.street !== undefined && { street: input.street }),
                ...(input.street2 !== undefined && { street2: input.street2 }),
                ...(input.city !== undefined && { city: input.city }),
                ...(input.province !== undefined && { province: input.province }),
                ...(input.code !== undefined && { code: input.code }),
                ...(input.country !== undefined && { country: input.country }),
                ...(input.organization !== undefined && { organization: input.organization }),
                ...(input.fname !== undefined && { fname: input.fname }),
                ...(input.lname !== undefined && { lname: input.lname }),
                ...(input.vat_name !== undefined && { vat_name: input.vat_name }),
                ...(input.vat_number !== undefined && { vat_number: input.vat_number }),
                ...(input.lines !== undefined && { lines: input.lines })
            }
        };

        const response = await nango.put({
            // https://www.freshbooks.com/api/estimates
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/estimates/estimates/${encodeURIComponent(String(input.estimateId))}`,
            data: body,
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);
        const estimate = parsed.response.result.estimate;

        return {
            id: estimate.id,
            status: estimate.status,
            create_date: estimate.create_date,
            customerid: estimate.customerid,
            estimate_number: estimate.estimate_number,
            amount: estimate.amount,
            currency_code: estimate.currency_code,
            ...(estimate.description !== '' && { description: estimate.description }),
            ...(estimate.notes !== '' && { notes: estimate.notes }),
            ...(estimate.terms != null && { terms: estimate.terms }),
            ...(estimate.po_number != null && { po_number: estimate.po_number }),
            ...(estimate.discount_value !== '' && { discount_value: estimate.discount_value }),
            discount_total: estimate.discount_total,
            ...(estimate.template !== '' && { template: estimate.template }),
            ...(estimate.language !== '' && { language: estimate.language }),
            vis_state: estimate.vis_state,
            invoiced: estimate.invoiced,
            ui_status: estimate.ui_status,
            display_status: estimate.display_status,
            ...(estimate.organization !== '' && { organization: estimate.organization }),
            ...(estimate.fname !== '' && { fname: estimate.fname }),
            ...(estimate.lname !== '' && { lname: estimate.lname }),
            ...(estimate.street !== '' && { street: estimate.street }),
            ...(estimate.street2 !== '' && { street2: estimate.street2 }),
            ...(estimate.city !== '' && { city: estimate.city }),
            ...(estimate.province !== '' && { province: estimate.province }),
            ...(estimate.country !== '' && { country: estimate.country }),
            ...(estimate.code !== '' && { code: estimate.code }),
            ...(estimate.vat_name != null && estimate.vat_name !== '' && { vat_name: estimate.vat_name }),
            ...(estimate.vat_number !== '' && { vat_number: estimate.vat_number }),
            updated: estimate.updated,
            created_at: estimate.created_at,
            ...(estimate.lines !== undefined && { lines: estimate.lines })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
