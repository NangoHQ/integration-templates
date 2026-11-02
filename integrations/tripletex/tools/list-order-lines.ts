import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        orderId: z
            .string()
            .regex(/^[1-9][0-9]*$/)
            .describe('Parent order whose lines to return.')
    })
    .describe('Selects one order by its numeric identifier.');

const OrderLineItemSchema = z.object({
    id: z.string().describe('Order-line identifier.'),
    orderId: z.string().describe('Parent order identifier.'),
    quantity: z.number().optional().describe('Line count in its product unit.'),
    isCharged: z.boolean().optional().describe('Whether the line is charged.'),
    productId: z.string().nullable().optional().describe('Linked product identifier.'),
    description: z.string().nullable().optional().describe('Ordinary line description.'),
    discountPercentage: z.number().optional().describe('Discount in percentage units.'),
    unitPriceExcludingVatCurrency: z.number().optional().describe('Unit price excluding VAT in order currency.')
});

const OutputSchema = z
    .object({
        items: z.array(OrderLineItemSchema).describe("Order's embedded lines in provider order; empty when none.")
    })
    .describe("The order's embedded line collection returned as one unpaginated page.");

const ProviderOrderLineSchema = z.object({
    id: z.number(),
    count: z.number().optional(),
    isCharged: z.boolean().optional(),
    product: z.object({ id: z.number() }).nullable().optional(),
    description: z.string().optional(),
    discount: z.number().optional(),
    unitPriceExcludingVatCurrency: z.number().optional()
});

const ProviderOrderEnvelopeSchema = z.object({
    value: z.object({
        id: z.number(),
        orderLines: z.array(ProviderOrderLineSchema)
    })
});

const HttpErrorSchema = z.object({
    response: z.object({ status: z.number() })
});

function httpErrorStatus(error: unknown): number | undefined {
    const parsed = HttpErrorSchema.safeParse(error);
    return parsed.success ? parsed.data.response.status : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads one order and its embedded line collection without changing provider data.
 * @pitfalls: Line fields Tripletex does not populate are omitted from the item, and productId and description can be explicit null. quantity mirrors the provider's count field, which Tripletex maps to the line's delivered quantity rather than the originally ordered amount.
 */
const tool = createTool({
    name: 'list-order-lines',
    description: "List the lines belonging to one known order, using the order's embedded line collection.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Obtain orderId from `list-orders` or `get-order`. Returns the order's embedded collection in one call, not all company lines. Use `get-order-line` for a known line ID.",
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let response;
        // @allowTryCatch: Maps Tripletex 404/403 failures to the public not_found/permission_denied codes; every other error is re-thrown unchanged.
        try {
            // https://tripletex.no/v2/openapi.json#GET%20/order/{id}
            response = await nango.get({
                endpoint: `/order/${encodeURIComponent(input.orderId)}`,
                params: {
                    fields: 'id,orderLines(id,count,isCharged,product,description,discount,unitPriceExcludingVatCurrency)'
                },
                retries: 3
            });
        } catch (error) {
            const status = httpErrorStatus(error);
            if (status === 404) {
                throw new Error('not_found: Parent order is unavailable. Locate an order with `list-orders`.');
            }
            if (status === 403) {
                throw new Error('permission_denied: The user cannot read the order or its lines. Ask the administrator for order access.');
            }
            throw error;
        }

        const order = ProviderOrderEnvelopeSchema.parse(response.data).value;

        return {
            items: order.orderLines.map((line) => ({
                id: String(line.id),
                orderId: String(order.id),
                ...(line.count !== undefined && { quantity: line.count }),
                ...(line.isCharged !== undefined && { isCharged: line.isCharged }),
                ...(line.product !== undefined && { productId: line.product === null ? null : String(line.product.id) }),
                ...(line.description !== undefined && { description: line.description }),
                ...(line.discount !== undefined && { discountPercentage: line.discount }),
                ...(line.unitPriceExcludingVatCurrency !== undefined && { unitPriceExcludingVatCurrency: line.unitPriceExcludingVatCurrency })
            }))
        };
    }
});

export default tool;
