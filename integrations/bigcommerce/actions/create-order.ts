import { z } from 'zod';
import { createAction } from 'nango';

const BillingAddressInputSchema = z.object({
    first_name: z.string(),
    last_name: z.string(),
    street_1: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
    country_iso2: z.string(),
    email: z.string()
});

const ProductOptionInputSchema = z.object({
    id: z.number().int(),
    value: z.number().int()
});

const ProductInputSchema = z.object({
    product_id: z.number().int(),
    quantity: z.number().int(),
    product_options: z.array(ProductOptionInputSchema).optional()
});

const InputSchema = z.object({
    billing_address: BillingAddressInputSchema,
    products: z.array(ProductInputSchema)
});

const ProviderOptionSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    name: z.string(),
    display_name: z.string(),
    type: z.string(),
    sort_order: z.number(),
    option_values: z.array(
        z.object({
            id: z.number(),
            label: z.string(),
            sort_order: z.number(),
            value_data: z.unknown().nullable(),
            is_default: z.boolean()
        })
    ),
    config: z.array(z.unknown())
});

const ProviderOptionsResponseSchema = z.object({
    data: z.array(ProviderOptionSchema),
    meta: z.object({
        pagination: z.object({
            total: z.number(),
            count: z.number(),
            per_page: z.number(),
            current_page: z.number(),
            total_pages: z.number(),
            links: z.object({
                current: z.string()
            })
        })
    })
});

const ProviderBillingAddressSchema = z.object({
    first_name: z.string(),
    last_name: z.string(),
    company: z.string().optional(),
    street_1: z.string(),
    street_2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
    country_iso2: z.string(),
    phone: z.string().optional(),
    email: z.string(),
    form_fields: z.array(z.unknown()).optional()
});

const ProviderOrderSchema = z.object({
    id: z.number(),
    customer_id: z.number(),
    status: z.string(),
    status_id: z.number(),
    total_ex_tax: z.string(),
    total_inc_tax: z.string(),
    billing_address: ProviderBillingAddressSchema.optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    customer_id: z.number(),
    status: z.string(),
    status_id: z.number(),
    total_ex_tax: z.string(),
    total_inc_tax: z.string(),
    billing_address: z
        .object({
            first_name: z.string(),
            last_name: z.string(),
            street_1: z.string(),
            city: z.string(),
            state: z.string(),
            zip: z.string(),
            country: z.string(),
            country_iso2: z.string(),
            email: z.string()
        })
        .optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const action = createAction({
    description: 'Create an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const productsWithOptions: Array<{
            product_id: number;
            quantity: number;
            product_options?: Array<{ id: number; value: number }> | undefined;
        }> = [];

        for (const product of input.products) {
            if (product.product_options && product.product_options.length > 0) {
                productsWithOptions.push(product);
                continue;
            }

            // https://developer.bigcommerce.com/docs/rest-management/catalog/products#get-product-options
            const optionsResponse = await nango.get({
                endpoint: `/v3/catalog/products/${encodeURIComponent(String(product.product_id))}/options`,
                retries: 3
            });

            const optionsData = ProviderOptionsResponseSchema.parse(optionsResponse.data);
            if (optionsData.data.length > 0) {
                throw new nango.ActionError({
                    type: 'missing_product_options',
                    message: `Product ${product.product_id} requires product_options. Please provide them for the order.`,
                    product_id: product.product_id,
                    required_options: optionsData.data.map((option) => ({ id: option.id, display_name: option.display_name }))
                });
            }

            productsWithOptions.push(product);
        }

        const body: {
            billing_address: z.infer<typeof BillingAddressInputSchema>;
            products: Array<{
                product_id: number;
                quantity: number;
                product_options?: Array<{ id: number; value: number }> | undefined;
            }>;
        } = {
            billing_address: input.billing_address,
            products: productsWithOptions
        };

        // https://developer.bigcommerce.com/docs/rest-management/orders#create-an-order
        const response = await nango.post({
            endpoint: '/v2/orders',
            data: body,
            retries: 3,
            headers: {
                Accept: 'application/json'
            }
        });

        const providerOrder = ProviderOrderSchema.parse(response.data);

        return {
            id: providerOrder.id,
            customer_id: providerOrder.customer_id,
            status: providerOrder.status,
            status_id: providerOrder.status_id,
            total_ex_tax: providerOrder.total_ex_tax,
            total_inc_tax: providerOrder.total_inc_tax,
            ...(providerOrder.billing_address && {
                billing_address: {
                    first_name: providerOrder.billing_address.first_name,
                    last_name: providerOrder.billing_address.last_name,
                    street_1: providerOrder.billing_address.street_1,
                    city: providerOrder.billing_address.city,
                    state: providerOrder.billing_address.state,
                    zip: providerOrder.billing_address.zip,
                    country: providerOrder.billing_address.country,
                    country_iso2: providerOrder.billing_address.country_iso2,
                    email: providerOrder.billing_address.email
                }
            }),
            ...(providerOrder.date_created && { date_created: providerOrder.date_created }),
            ...(providerOrder.date_modified && { date_modified: providerOrder.date_modified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
