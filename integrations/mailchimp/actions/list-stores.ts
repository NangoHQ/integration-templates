import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    count: z.number().optional().describe('The number of records to return. Maximum 1000, default 10.'),
    fields: z.string().optional().describe('A comma-separated list of fields to return.'),
    exclude_fields: z.string().optional().describe('A comma-separated list of fields to exclude.')
});

const AddressSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    province_code: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    longitude: z.number().optional(),
    latitude: z.number().optional()
});

const ProviderStoreSchema = z.object({
    id: z.string(),
    list_id: z.string().optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    email_address: z.string().optional(),
    currency_code: z.string().optional(),
    money_format: z.string().optional(),
    primary_locale: z.string().optional(),
    timezone: z.string().optional(),
    phone: z.string().optional(),
    address: AddressSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    stores: z.array(ProviderStoreSchema),
    total_items: z.number().optional()
});

const StoreSchema = z.object({
    id: z.string(),
    list_id: z.string().optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    email_address: z.string().optional(),
    currency_code: z.string().optional(),
    money_format: z.string().optional(),
    primary_locale: z.string().optional(),
    timezone: z.string().optional(),
    phone: z.string().optional(),
    address: AddressSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(StoreSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List stores from Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-stores',
        group: 'E-commerce Stores'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const count = input.count ?? 10;
        const offset = input.cursor ? (/^\d+$/.test(input.cursor) ? parseInt(input.cursor, 10) : NaN) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer string representing an offset'
            });
        }

        const params: Record<string, string> = {
            count: count.toString(),
            offset: offset.toString()
        };

        if (input['fields'] !== undefined) {
            params['fields'] = input['fields'];
        }

        if (input['exclude_fields'] !== undefined) {
            params['exclude_fields'] = input['exclude_fields'];
        }

        const response = await nango.get({
            // https://mailchimp.com/developer/marketing/api/ecommerce-stores/list-stores/
            endpoint: '/3.0/ecommerce/stores',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.stores.map((store) => ({
            id: store.id,
            ...(store.list_id !== undefined && { list_id: store.list_id }),
            ...(store.name !== undefined && { name: store.name }),
            ...(store.domain !== undefined && { domain: store.domain }),
            ...(store.email_address !== undefined && { email_address: store.email_address }),
            ...(store.currency_code !== undefined && { currency_code: store.currency_code }),
            ...(store.money_format !== undefined && { money_format: store.money_format }),
            ...(store.primary_locale !== undefined && { primary_locale: store.primary_locale }),
            ...(store.timezone !== undefined && { timezone: store.timezone }),
            ...(store.phone !== undefined && { phone: store.phone }),
            ...(store.address !== undefined && { address: store.address }),
            ...(store.created_at !== undefined && { created_at: store.created_at }),
            ...(store.updated_at !== undefined && { updated_at: store.updated_at })
        }));

        const totalItems = providerResponse.total_items ?? items.length;
        const nextOffset = offset + items.length;
        const hasMore = nextOffset < totalItems;

        return {
            items,
            ...(hasMore && { next_cursor: nextOffset.toString() })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
