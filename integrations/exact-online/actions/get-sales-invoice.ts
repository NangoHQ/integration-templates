import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The InvoiceID of the sales invoice. Example: "7b282ae4-d920-46b0-87fd-3da21b818780"')
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const SalesInvoiceSchema = z.object({
    d: z
        .object({
            InvoiceID: z.string().nullish(),
            InvoiceNumber: z.number().nullish(),
            InvoiceDate: z.string().nullish(),
            DueDate: z.string().nullish(),
            Status: z.number().nullish(),
            AmountDC: z.number().nullish(),
            AmountFC: z.number().nullish(),
            Currency: z.string().nullish(),
            Description: z.string().nullish(),
            Journal: z.string().nullish(),
            OrderNumber: z.number().nullish(),
            Type: z.number().nullish(),
            Modified: z.string().nullish(),
            Created: z.string().nullish()
        })
        .passthrough()
});

const OutputSchema = z
    .object({
        InvoiceID: z.string().nullish(),
        InvoiceNumber: z.number().nullish(),
        InvoiceDate: z.string().nullish(),
        DueDate: z.string().nullish(),
        Status: z.number().nullish(),
        AmountDC: z.number().nullish(),
        AmountFC: z.number().nullish(),
        Currency: z.string().nullish(),
        Description: z.string().nullish(),
        Journal: z.string().nullish(),
        OrderNumber: z.number().nullish(),
        Type: z.number().nullish(),
        Modified: z.string().nullish(),
        Created: z.string().nullish()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single sales invoice by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.nango.dev/integrations/all/exact-online
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const meResult = meData.d.results[0];
        if (!meResult) {
            throw new nango.ActionError({
                type: 'missing_user',
                message: 'Unable to retrieve current user from Exact Online.'
            });
        }
        const division = meResult.CurrentDivision;

        // https://docs.nango.dev/integrations/all/exact-online
        const response = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(division.toString())}/salesinvoice/SalesInvoices(guid'${encodeURIComponent(input.id)}')`,
            retries: 3
        });

        const invoiceData = SalesInvoiceSchema.parse(response.data);
        return invoiceData.d;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
