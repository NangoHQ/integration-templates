import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const MetadataSchema = z.object({
    organization_id: z.string().describe('Organization ID. Example: "927270289"')
});

const ProviderPurchaseOrderSchema = z
    .object({
        purchaseorder_id: z.string(),
        vendor_id: z.string().optional(),
        vendor_name: z.string().optional(),
        status: z.string().optional(),
        purchaseorder_number: z.string().optional(),
        reference_number: z.string().optional(),
        date: z.string().optional(),
        delivery_date: z.string().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        price_precision: z.coerce.number().optional(),
        total: z.coerce.number().optional(),
        has_attachment: z.boolean().optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    purchaseorders: z.array(z.unknown()).optional(),
    page_context: z
        .object({
            page: z.number(),
            per_page: z.number(),
            has_more_page: z.boolean()
        })
        .optional()
});

const OutputSchema = z.object({
    purchaseorders: z.array(ProviderPurchaseOrderSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List purchase orders from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-purchase-orders',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['ZohoBooks.purchaseorders.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid positive integer page number.'
            });
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/purchase-order/#list-purchase-orders
            endpoint: '/books/v3/purchaseorders',
            params: {
                organization_id: metadata.organization_id,
                page: String(page),
                per_page: '200'
            },
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);
        const purchaseorders = z.array(ProviderPurchaseOrderSchema).parse(Array.isArray(data.purchaseorders) ? data.purchaseorders : []);
        const hasMore = data.page_context?.has_more_page === true;

        return {
            purchaseorders,
            ...(hasMore && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
