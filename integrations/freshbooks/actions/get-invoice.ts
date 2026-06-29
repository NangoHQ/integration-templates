import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoiceId: z.string().describe('Invoice ID. Example: "453877"')
});

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const MoneySchema = z
    .object({
        amount: z.string(),
        code: z.string()
    })
    .optional();

const ProviderInvoiceSchema = z
    .object({
        invoiceid: z.number(),
        id: z.number(),
        customerid: z.number(),
        invoice_number: z.string(),
        amount: MoneySchema,
        outstanding: MoneySchema,
        paid: MoneySchema,
        status: z.number().optional(),
        v3_status: z.string().optional(),
        create_date: z.string().optional(),
        due_date: z.string().optional(),
        updated: z.string().optional(),
        currency_code: z.string().optional(),
        notes: z.string().optional(),
        description: z.string().optional(),
        terms: z.string().nullable().optional(),
        po_number: z.string().nullable().optional(),
        discount_value: z.string().optional(),
        discount_total: MoneySchema,
        deposit_status: z.string().optional(),
        display_status: z.string().optional(),
        payment_status: z.string().optional(),
        organization: z.string().optional(),
        fname: z.string().optional(),
        lname: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
        code: z.string().optional(),
        street: z.string().optional(),
        street2: z.string().optional(),
        vat_name: z.string().nullable().optional(),
        vat_number: z.string().optional(),
        ownerid: z.number().optional(),
        auto_bill: z.boolean().optional(),
        sentid: z.number().optional(),
        show_attachments: z.boolean().optional(),
        template: z.string().optional(),
        language: z.string().optional(),
        vis_state: z.number().optional(),
        uuid: z.string().optional(),
        created_at: z.string().optional(),
        date_paid: z.string().nullable().optional(),
        lines: z.array(z.unknown()).optional(),
        presentation: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = ProviderInvoiceSchema;

const ResponseSchema = z.object({
    response: z.object({
        result: z.object({
            invoice: ProviderInvoiceSchema
        })
    })
});

const action = createAction({
    description: 'Retrieve a single invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:invoices:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        if (!metadata || typeof metadata.accountId !== 'string' || metadata.accountId.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const response = await nango.get({
            // https://www.freshbooks.com/api/invoices
            endpoint: `/accounting/account/${encodeURIComponent(metadata.accountId)}/invoices/invoices/${encodeURIComponent(input.invoiceId)}`,
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);

        return parsed.response.result.invoice;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
