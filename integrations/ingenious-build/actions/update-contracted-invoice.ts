import { z } from 'zod';
import { createAction } from 'nango';

const UpdateInvoiceWbsItemInputSchema = z.object({
    item_id: z.string().nullable().optional().describe('Optional identifier. When populated, updates the corresponding item. When empty, creates a new item.'),
    contract_wbs1_id: z.string().describe('Item wbs ID'),
    value: z.string().describe('Item gross value. Example: "100.00"'),
    material_stored_value: z.string().nullable().optional().describe('Item material stored value. Example: "100.00"'),
    current_retention_value: z.string().nullable().optional().describe('Item retention value. Example: "100.00"'),
    released_retention_value: z.string().optional().describe('Item released retention value. Example: "100.00"')
});

const InputSchema = z.object({
    id: z.string().describe('Contracted invoice ID. Example: "6a71e07dcb6ddf6b370e0afd"'),
    custom_id: z.string().nullable().optional().describe('Invoice Custom ID'),
    funding_source_id: z.string().nullable().optional().describe('Funding Source ID'),
    invoice_date: z.string().nullable().optional().describe('Invoice date. Example: "2024-07-21"'),
    start_date: z.string().nullable().optional().describe('Start date. Example: "2024-07-21"'),
    end_date: z.string().nullable().optional().describe('End date. Example: "2024-07-21"'),
    wbs1: z
        .array(UpdateInvoiceWbsItemInputSchema)
        .nullable()
        .optional()
        .describe('Invoice items. Existing invoice items not included in the update request will be automatically removed.'),
    document_ids: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('List of document IDs to attach to the invoice as supporting documents. Existing documents not included in this list will be removed.')
});

const OutputSchema = z.object({
    id: z.string(),
    updated: z.boolean()
});

const action = createAction({
    description: 'Update fields on an existing contracted invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        type UpdateBody = {
            custom_id?: string | null;
            funding_source_id?: string | null;
            invoice_date?: string | null;
            start_date?: string | null;
            end_date?: string | null;
            wbs1?: z.infer<typeof UpdateInvoiceWbsItemInputSchema>[] | null;
            document_ids?: string[] | null;
        };

        const body: UpdateBody = {};

        if (input.custom_id !== undefined) {
            body.custom_id = input.custom_id;
        }
        if (input.funding_source_id !== undefined) {
            body.funding_source_id = input.funding_source_id;
        }
        if (input.invoice_date !== undefined) {
            body.invoice_date = input.invoice_date;
        }
        if (input.start_date !== undefined) {
            body.start_date = input.start_date;
        }
        if (input.end_date !== undefined) {
            body.end_date = input.end_date;
        }
        if (input.wbs1 !== undefined) {
            body.wbs1 = input.wbs1;
        }
        if (input.document_ids !== undefined) {
            body.document_ids = input.document_ids;
        }

        // https://api.ingenious.build/reference/v2-update-contracted-invoicepub.md
        const response = await nango.patch({
            endpoint: `/api/v2/pub/contracted-invoices/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 204 No Content, received ${response.status}`,
                invoice_id: input.id
            });
        }

        return {
            id: input.id,
            updated: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
