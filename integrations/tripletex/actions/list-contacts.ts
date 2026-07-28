import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.')
});

const ProviderCountrySchema = z
    .object({
        id: z.number().optional(),
        name: z.string().optional(),
        isoAlpha2Code: z.string().optional()
    })
    .nullish();

const ProviderCustomerSchema = z
    .object({
        id: z.number().optional(),
        name: z.string().optional()
    })
    .nullish();

const ProviderDepartmentSchema = z
    .object({
        id: z.number().optional(),
        name: z.string().optional()
    })
    .nullish();

const ProviderContactSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    displayName: z.string().nullish(),
    email: z.string().nullish(),
    phoneNumberMobileCountry: ProviderCountrySchema,
    phoneNumberMobile: z.string().nullish(),
    phoneNumberWork: z.string().nullish(),
    customer: ProviderCustomerSchema,
    department: ProviderDepartmentSchema,
    isInactive: z.boolean().optional()
});

const OutputContactSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    phoneNumberMobileCountry: ProviderCountrySchema,
    phoneNumberMobile: z.string().optional(),
    phoneNumberWork: z.string().optional(),
    customer: ProviderCustomerSchema,
    department: ProviderDepartmentSchema,
    isInactive: z.boolean().optional()
});

const ListOutputSchema = z.object({
    items: z.array(OutputContactSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List contacts.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string.'
            });
        }
        const from = input.cursor ? Number(input.cursor) : 0;
        const count = 1000;

        const config: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: '/v2/contact',
            params: {
                from: String(from),
                count: String(count)
            },
            retries: 3
        };

        const response = await nango.get(config);

        const listResponse = z
            .object({
                fullResultSize: z.number().optional(),
                from: z.number().optional(),
                count: z.number().optional(),
                versionDigest: z.string().optional(),
                values: z.array(ProviderContactSchema)
            })
            .parse(response.data);

        const items = listResponse.values.map((contact) => ({
            id: contact.id,
            ...(contact.version != null && { version: contact.version }),
            ...(contact.url != null && { url: contact.url }),
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.displayName != null && { displayName: contact.displayName }),
            ...(contact.email != null && { email: contact.email }),
            ...(contact.phoneNumberMobileCountry != null && { phoneNumberMobileCountry: contact.phoneNumberMobileCountry }),
            ...(contact.phoneNumberMobile != null && { phoneNumberMobile: contact.phoneNumberMobile }),
            ...(contact.phoneNumberWork != null && { phoneNumberWork: contact.phoneNumberWork }),
            ...(contact.customer != null && { customer: contact.customer }),
            ...(contact.department != null && { department: contact.department }),
            ...(contact.isInactive != null && { isInactive: contact.isInactive })
        }));

        const nextFrom = from + listResponse.values.length;
        const hasMore = listResponse.fullResultSize != null ? nextFrom < listResponse.fullResultSize : listResponse.values.length === count;
        const nextCursor = hasMore ? String(nextFrom) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
