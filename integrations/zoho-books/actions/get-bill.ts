import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    bill_id: z.string().describe('The unique ID of the bill to retrieve. Example: "260815000000108002"')
});

const MetadataSchema = z.object({
    organization_id: z.string().describe('The Zoho Books organization ID. Example: "927270289"')
});

const ApiResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    bill: z.record(z.string(), z.unknown())
});

const BillSchema = z
    .object({
        bill_id: z.string(),
        vendor_id: z.string().optional(),
        vendor_name: z.string().optional(),
        status: z.string().optional(),
        bill_number: z.string().optional(),
        date: z.string().optional(),
        due_date: z.string().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        exchange_rate: z.number().optional(),
        total: z.number().optional(),
        balance: z.number().optional(),
        line_items: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const OutputSchema = BillSchema;

const action = createAction({
    description: 'Retrieve a single bill from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-bill',
        group: 'Bills'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['ZohoBooks.bills.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const organization_id = parsedMetadata.data.organization_id;

        const config: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/bills/#get-a-bill
            endpoint: `/books/v3/bills/${encodeURIComponent(input.bill_id)}`,
            params: {
                organization_id
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Zoho Books API.'
            });
        }

        const parsed = ApiResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message,
                code: parsed.code
            });
        }

        const bill = BillSchema.parse(parsed.bill);
        return bill;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
