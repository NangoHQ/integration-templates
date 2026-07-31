import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const CustomerSchema = z
    .object({
        id: z.number(),
        version: z.number().optional(),
        url: z.string().optional(),
        name: z.string(),
        displayName: z.string().nullish(),
        email: z.string().nullish(),
        invoiceEmail: z.string().nullish(),
        organizationNumber: z.string().nullish(),
        customerNumber: z.number().nullish(),
        supplierNumber: z.number().nullish(),
        phoneNumber: z.string().nullish(),
        phoneNumberMobile: z.string().nullish(),
        isInactive: z.boolean().optional(),
        isCustomer: z.boolean().optional(),
        isSupplier: z.boolean().optional(),
        isPrivateIndividual: z.boolean().optional(),
        description: z.string().nullish(),
        website: z.string().nullish(),
        language: z.string().nullish(),
        currency: z.unknown().optional(),
        physicalAddress: z.unknown().optional(),
        postalAddress: z.unknown().optional(),
        deliveryAddress: z.unknown().optional(),
        department: z.unknown().optional(),
        ledgerAccount: z.unknown().optional(),
        accountManager: z.unknown().optional(),
        category1: z.unknown().optional(),
        category2: z.unknown().optional(),
        category3: z.unknown().optional(),
        discountPercentage: z.number().optional(),
        invoicesDueIn: z.number().optional(),
        invoicesDueInType: z.string().optional(),
        invoiceSendMethod: z.string().optional(),
        emailAttachmentType: z.string().optional(),
        invoiceSendSMSNotification: z.boolean().optional(),
        invoiceSMSNotificationNumber: z.string().optional(),
        isAutomaticReminderEnabled: z.boolean().optional(),
        isAutomaticSoftReminderEnabled: z.boolean().optional(),
        isAutomaticNoticeOfDebtCollectionEnabled: z.boolean().optional(),
        isFactoring: z.boolean().optional(),
        singleCustomerInvoice: z.boolean().optional(),
        overdueNoticeEmail: z.string().optional(),
        globalLocationNumber: z.number().optional(),
        bankAccounts: z.unknown().optional(),
        bankAccountPresentation: z.unknown().optional(),
        changes: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CustomerSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor value. Must be a non-negative integer offset string.'
            });
        }
        const pageSize = 1000;
        const from = input.cursor ? Number(input.cursor) : 0;

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: 'v2/customer',
            params: {
                from: String(from),
                count: String(pageSize)
            },
            retries: 3
        });

        const raw = response.data;

        const ListResponseSchema = z.object({
            values: z.array(z.unknown()).default([]),
            count: z.number().default(0),
            from: z.number().default(0),
            fullResultSize: z.number().optional(),
            versionDigest: z.string().optional()
        });

        const listResponse = ListResponseSchema.parse(raw);
        const items = listResponse.values.map((item: unknown) => CustomerSchema.parse(item));

        const nextFrom = listResponse.from + listResponse.count;
        const hasMore = listResponse.fullResultSize != null ? nextFrom < listResponse.fullResultSize : items.length === pageSize;

        const nextCursor = hasMore ? String(nextFrom) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
