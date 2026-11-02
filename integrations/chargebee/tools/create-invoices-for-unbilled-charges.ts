import { z } from 'zod';
import { createTool } from 'nango';

const subscriptionIdField = z.string().min(1).max(50).describe('Bill unbilled charges belonging to this subscription; mutually exclusive with customerId.');

const customerIdField = z
    .string()
    .min(1)
    .max(50)
    .describe("Bill this customer's unbilled charges; requires consolidated invoicing and excludes subscriptionId.");

const businessEntityIdField = z.string().min(1).describe('Business entity; omitted uses connection default.');

const InputSchema = z
    .object({
        customerId: customerIdField.optional(),
        subscriptionId: subscriptionIdField.optional(),
        businessEntityId: businessEntityIdField.optional()
    })
    .refine((value) => (value.subscriptionId === undefined) !== (value.customerId === undefined), {
        message: 'Provide exactly one of subscriptionId or customerId.'
    })
    // The anyOf clauses are part of the approved public JSON Schema; Zod cannot express them structurally, so they are attached as metadata, which the compiler copies into the compiled schema. The refine above enforces the same exclusivity at runtime.
    .meta({
        description: 'Scope of unbilled charges to bill: exactly one of subscriptionId or customerId, plus an optional business entity override.',
        anyOf: [
            { not: { required: ['customerId'] }, required: ['subscriptionId'] },
            { not: { required: ['subscriptionId'] }, required: ['customerId'] }
        ]
    });

const OutputItemSchema = z.object({
    id: z.string().describe('Created invoice identifier.'),
    status: z.string().describe('Current invoice state, not proof of future collection.'),
    customerId: z.string().describe('Customer owning the invoice.'),
    documentAt: z.iso.datetime({ offset: true }).optional().describe('Invoice document timestamp in UTC if returned; not an inferred creation instant.'),
    totalMinor: z.number().int().optional().describe('Invoice total in currency minor units if returned.'),
    currencyCode: z.string().describe('ISO 4217 invoice currency.'),
    amountDueMinor: z.number().int().optional().describe('Current unpaid amount in currency minor units if returned.'),
    subscriptionId: z.string().nullable().optional().describe('Single subscription reference, if supplied; can be null for consolidated invoices.')
});

const OutputSchema = z
    .object({
        items: z.array(OutputItemSchema).describe('Invoices returned by this creation request, not a paginated collection.')
    })
    .describe('Invoices created by billing the selected unbilled charges.');

const ProviderInvoiceSchema = z.object({
    id: z.string(),
    customer_id: z.string(),
    subscription_id: z.string().nullable().optional(),
    currency_code: z.string(),
    status: z.string(),
    date: z.number().int().nullable().optional(),
    total: z.number().int().nullable().optional(),
    amount_due: z.number().int().nullable().optional()
});

const ProviderResponseSchema = z.object({
    invoices: z.array(ProviderInvoiceSchema)
});

const ProviderHttpErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown()
    })
});

const ProviderErrorBodySchema = z.object({
    message: z.string().optional(),
    api_error_code: z.string().optional(),
    type: z.string().optional()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Bills unbilled charges into new invoices, applies available credits and excess payments, and can immediately schedule payment collection; reversing the effect requires voiding the created invoices.
 * @pitfalls: Billing a customer (not a subscription) requires consolidated invoicing and can return several invoices split by currency, PO number grouping, shipping address, auto collection, or payment method. If auto collection is on for the customer, invoices are created in payment_due state and payment collection is scheduled immediately, so a returned invoice is not proof of payment. Available credits and excess payments are applied automatically. After an uncertain failure, invoices may already have been created, so verify before retrying.
 */
const tool = createTool({
    name: 'create-invoices-for-unbilled-charges',
    description: 'Bill unbilled charges for one subscription or, with consolidated invoicing, one customer, returning all invoices created by that request.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Inspect `list-unbilled-charges` first. Choose either subscriptionId or customerId; customer-wide billing requires consolidated invoicing. Credits and excess payments apply automatically, and auto collection schedules payment immediately. Multiple invoices can result. The tool does not wait for payment settlement; do not retry an uncertain write blindly.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const headers: Record<string, string> = input.businessEntityId !== undefined ? { 'chargebee-business-entity-id': input.businessEntityId } : {};

        let response;
        // @allowTryCatch: Chargebee HTTP and transport failures must be mapped to the public error codes; a failed or lost response can still mean invoices were created.
        try {
            response = await nango.post({
                // https://apidocs.chargebee.com/docs/api/unbilled_charges/create-an-invoice-for-unbilled-charges
                endpoint: '/api/v2/unbilled_charges/invoice_unbilled_charges',
                params: input.subscriptionId !== undefined ? { subscription_id: input.subscriptionId } : { customer_id: input.customerId ?? '' },
                ...(Object.keys(headers).length > 0 && { headers }),
                // Creating invoices is not idempotent without a caller-managed idempotency key, so a retry could bill the same charges twice.
                retries: 0
            });
        } catch (error) {
            const httpError = ProviderHttpErrorSchema.safeParse(error);
            if (!httpError.success) {
                throw new Error(
                    'write_result_unknown: The request to Chargebee failed without a response; invoices may have been created. Check invoices and `list-unbilled-charges` before another request.'
                );
            }

            const { status, data } = httpError.data.response;
            const body = ProviderErrorBodySchema.safeParse(data);
            const apiErrorCode = body.success ? body.data.api_error_code : undefined;
            const errorType = body.success ? body.data.type : undefined;
            const providerMessage = body.success && body.data.message ? body.data.message : `HTTP ${status} from Chargebee`;

            if (status === 429) {
                throw new Error(`rate_limited: Chargebee rate limit exceeded (${providerMessage}). Wait and inspect charges/invoices before retrying.`);
            }
            if (status === 404) {
                throw new Error(
                    `not_found: The customer or subscription cannot be found (${providerMessage}). Verify the subscription with \`get-subscription\` or the customer in Chargebee.`
                );
            }
            if (status === 401 || status === 403) {
                throw new Error(
                    `permission_denied: Invoice creation or business entity access is denied (${providerMessage}). Ask the administrator for billing access.`
                );
            }
            if (status >= 500) {
                throw new Error(
                    `provider_unavailable: Chargebee returned a server error (${providerMessage}). Inspect the Chargebee console for created invoices before retrying later.`
                );
            }
            if (apiErrorCode === 'unsupported_feature' || apiErrorCode === 'configuration_incompatible') {
                throw new Error(
                    `feature_unavailable: Customer scope requires consolidated invoicing (${providerMessage}). Use subscriptionId instead or ask the administrator to enable consolidated invoicing.`
                );
            }
            if (status === 409 || apiErrorCode === 'invalid_state_for_request' || apiErrorCode === 'invalid_operation' || errorType === 'payment') {
                throw new Error(
                    `invalid_state: No eligible unbilled charges exist or the billing state prevents invoice creation (${providerMessage}). Inspect \`list-unbilled-charges\` and resolve the billing state before retrying.`
                );
            }
            throw new Error(`invalid_request: Chargebee rejected the target or entity selection (${providerMessage}). Correct the reported selection.`);
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(
                'write_result_unknown: The Chargebee response could not be interpreted; invoices may have been created. Check invoices and `list-unbilled-charges` before another request.'
            );
        }

        return {
            items: parsed.data.invoices.map((invoice) => ({
                id: invoice.id,
                status: invoice.status,
                customerId: invoice.customer_id,
                currencyCode: invoice.currency_code,
                ...(invoice.date != null && { documentAt: new Date(invoice.date * 1000).toISOString().replace(/\.000Z$/, 'Z') }),
                ...(invoice.total != null && { totalMinor: invoice.total }),
                ...(invoice.amount_due != null && { amountDueMinor: invoice.amount_due }),
                ...(invoice.subscription_id !== undefined && { subscriptionId: invoice.subscription_id })
            }))
        };
    }
});

export default tool;
