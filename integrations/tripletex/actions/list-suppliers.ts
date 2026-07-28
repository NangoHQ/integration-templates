import { z } from 'zod';
import { createAction } from 'nango';

const ListInputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderSupplierSchema = z
    .object({
        id: z.number(),
        version: z.number().nullish(),
        name: z.string(),
        organizationNumber: z.string().nullish(),
        supplierNumber: z.number().nullish(),
        customerNumber: z.number().nullish(),
        isSupplier: z.boolean().nullish(),
        isCustomer: z.boolean().nullish(),
        isInactive: z.boolean().nullish(),
        email: z.string().nullish(),
        invoiceEmail: z.string().nullish(),
        phoneNumber: z.string().nullish(),
        phoneNumberMobile: z.string().nullish(),
        description: z.string().nullish(),
        isPrivateIndividual: z.boolean().nullish(),
        showProducts: z.boolean().nullish(),
        displayName: z.string().nullish(),
        language: z.string().nullish(),
        website: z.string().nullish(),
        url: z.string().nullish()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    fullResultSize: z.number().nullish(),
    from: z.number().nullish(),
    count: z.number().nullish(),
    versionDigest: z.string().nullish(),
    values: z.array(ProviderSupplierSchema).nullish()
});

const SupplierSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    name: z.string(),
    organizationNumber: z.string().optional(),
    supplierNumber: z.number().optional(),
    customerNumber: z.number().optional(),
    isSupplier: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    email: z.string().optional(),
    invoiceEmail: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    description: z.string().optional(),
    isPrivateIndividual: z.boolean().optional(),
    showProducts: z.boolean().optional(),
    displayName: z.string().optional(),
    language: z.string().optional(),
    website: z.string().optional(),
    url: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(SupplierSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List suppliers.',
    version: '1.0.0',
    input: ListInputSchema,
    output: ListOutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const from = input.cursor ? Number(input.cursor) : 0;
        if (Number.isNaN(from)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid number'
            });
        }

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: 'v2/supplier',
            params: {
                from: String(from),
                count: '100'
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Tripletex API',
                details: parsed.error.message
            });
        }

        const data = parsed.data;
        const items = (data.values || []).map((item) => ({
            id: item.id,
            ...(item.version != null ? { version: item.version } : {}),
            name: item.name,
            ...(item.organizationNumber != null ? { organizationNumber: item.organizationNumber } : {}),
            ...(item.supplierNumber != null ? { supplierNumber: item.supplierNumber } : {}),
            ...(item.customerNumber != null ? { customerNumber: item.customerNumber } : {}),
            ...(item.isSupplier != null ? { isSupplier: item.isSupplier } : {}),
            ...(item.isCustomer != null ? { isCustomer: item.isCustomer } : {}),
            ...(item.isInactive != null ? { isInactive: item.isInactive } : {}),
            ...(item.email != null ? { email: item.email } : {}),
            ...(item.invoiceEmail != null ? { invoiceEmail: item.invoiceEmail } : {}),
            ...(item.phoneNumber != null ? { phoneNumber: item.phoneNumber } : {}),
            ...(item.phoneNumberMobile != null ? { phoneNumberMobile: item.phoneNumberMobile } : {}),
            ...(item.description != null ? { description: item.description } : {}),
            ...(item.isPrivateIndividual != null ? { isPrivateIndividual: item.isPrivateIndividual } : {}),
            ...(item.showProducts != null ? { showProducts: item.showProducts } : {}),
            ...(item.displayName != null ? { displayName: item.displayName } : {}),
            ...(item.language != null ? { language: item.language } : {}),
            ...(item.website != null ? { website: item.website } : {}),
            ...(item.url != null ? { url: item.url } : {})
        }));

        const fullResultSize = data.fullResultSize ?? 0;
        const count = data.count ?? 0;
        const nextFrom = from + count;

        return {
            items,
            ...(nextFrom < fullResultSize ? { nextCursor: String(nextFrom) } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
