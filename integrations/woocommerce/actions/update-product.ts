import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Product ID. Example: 13'),
    name: z.string().optional().describe('Product name'),
    slug: z.string().optional().describe('Product slug'),
    type: z.enum(['simple', 'grouped', 'external', 'variable']).optional().describe('Product type'),
    status: z.enum(['draft', 'pending', 'private', 'publish']).optional().describe('Product status'),
    featured: z.boolean().optional().describe('Whether the product is featured'),
    catalog_visibility: z.enum(['visible', 'catalog', 'search', 'hidden']).optional().describe('Catalog visibility'),
    description: z.string().optional().describe('Product description'),
    short_description: z.string().optional().describe('Product short description'),
    sku: z.string().optional().describe('SKU'),
    regular_price: z.string().optional().describe('Regular price'),
    sale_price: z.string().nullable().optional().describe('Sale price'),
    date_on_sale_from: z.string().nullable().optional().describe('Start date of sale price'),
    date_on_sale_to: z.string().nullable().optional().describe('End date of sale price'),
    virtual: z.boolean().optional().describe('Whether the product is virtual'),
    downloadable: z.boolean().optional().describe('Whether the product is downloadable'),
    download_limit: z.number().nullable().optional().describe('Download limit'),
    download_expiry: z.number().nullable().optional().describe('Download expiry days'),
    external_url: z.string().optional().describe('External URL for external products'),
    button_text: z.string().optional().describe('Button text for external products'),
    tax_status: z.enum(['taxable', 'shipping', 'none']).optional().describe('Tax status'),
    tax_class: z.string().optional().describe('Tax class'),
    manage_stock: z.boolean().optional().describe('Whether to manage stock'),
    stock_quantity: z.number().nullable().optional().describe('Stock quantity'),
    stock_status: z.enum(['instock', 'outofstock', 'onbackorder']).optional().describe('Stock status'),
    backorders: z.enum(['no', 'notify', 'yes']).optional().describe('Backorders setting'),
    sold_individually: z.boolean().optional().describe('Whether to sell individually'),
    weight: z.string().optional().describe('Product weight'),
    dimensions: z
        .object({
            length: z.string().optional(),
            width: z.string().optional(),
            height: z.string().optional()
        })
        .optional()
        .describe('Product dimensions'),
    shipping_class: z.string().optional().describe('Shipping class slug'),
    reviews_allowed: z.boolean().optional().describe('Whether reviews are allowed'),
    parent_id: z.number().optional().describe('Parent product ID for variations'),
    purchase_note: z.string().optional().describe('Purchase note'),
    categories: z
        .array(z.object({ id: z.number() }))
        .optional()
        .describe('Product categories'),
    tags: z
        .array(z.object({ id: z.number() }))
        .optional()
        .describe('Product tags'),
    images: z
        .array(
            z.object({
                id: z.number().optional(),
                src: z.string().optional(),
                name: z.string().optional(),
                alt: z.string().optional()
            })
        )
        .optional()
        .describe('Product images'),
    attributes: z
        .array(
            z.object({
                id: z.number().optional(),
                name: z.string(),
                position: z.number().optional(),
                visible: z.boolean().optional(),
                variation: z.boolean().optional(),
                options: z.array(z.string())
            })
        )
        .optional()
        .describe('Product attributes'),
    default_attributes: z
        .array(
            z.object({
                id: z.number().optional(),
                name: z.string(),
                option: z.string()
            })
        )
        .optional()
        .describe('Default attributes for variations'),
    menu_order: z.number().optional().describe('Menu order'),
    meta_data: z
        .array(z.object({ id: z.number().optional(), key: z.string(), value: z.string() }))
        .optional()
        .describe('Meta data')
});

const ProviderProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    permalink: z.string(),
    date_created: z.string(),
    date_created_gmt: z.string(),
    date_modified: z.string(),
    date_modified_gmt: z.string(),
    type: z.enum(['simple', 'grouped', 'external', 'variable']),
    status: z.enum(['draft', 'pending', 'private', 'publish']),
    featured: z.boolean(),
    catalog_visibility: z.enum(['visible', 'catalog', 'search', 'hidden']),
    description: z.string(),
    short_description: z.string(),
    sku: z.string(),
    price: z.string(),
    regular_price: z.string(),
    sale_price: z.string().nullable(),
    date_on_sale_from: z.string().nullable(),
    date_on_sale_from_gmt: z.string().nullable(),
    date_on_sale_to: z.string().nullable(),
    date_on_sale_to_gmt: z.string().nullable(),
    on_sale: z.boolean(),
    purchasable: z.boolean(),
    total_sales: z.number(),
    virtual: z.boolean(),
    downloadable: z.boolean(),
    download_limit: z.number().nullable(),
    download_expiry: z.number().nullable(),
    external_url: z.string(),
    button_text: z.string(),
    tax_status: z.enum(['taxable', 'shipping', 'none']),
    tax_class: z.string(),
    manage_stock: z.boolean(),
    stock_quantity: z.number().nullable(),
    stock_status: z.enum(['instock', 'outofstock', 'onbackorder']),
    backorders: z.enum(['no', 'notify', 'yes']),
    backorders_allowed: z.boolean(),
    backordered: z.boolean(),
    sold_individually: z.boolean(),
    weight: z.string(),
    dimensions: z.object({
        length: z.string(),
        width: z.string(),
        height: z.string()
    }),
    shipping_required: z.boolean(),
    shipping_taxable: z.boolean(),
    shipping_class: z.string(),
    shipping_class_id: z.number().nullable(),
    reviews_allowed: z.boolean(),
    average_rating: z.string(),
    rating_count: z.number(),
    parent_id: z.number(),
    purchase_note: z.string(),
    categories: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            slug: z.string()
        })
    ),
    tags: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            slug: z.string()
        })
    ),
    images: z.array(
        z.object({
            id: z.number(),
            date_created: z.string(),
            date_created_gmt: z.string(),
            date_modified: z.string(),
            date_modified_gmt: z.string(),
            src: z.string(),
            name: z.string(),
            alt: z.string()
        })
    ),
    attributes: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            position: z.number(),
            visible: z.boolean(),
            variation: z.boolean(),
            options: z.array(z.string())
        })
    ),
    default_attributes: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            option: z.string()
        })
    ),
    variations: z.array(z.number()),
    grouped_products: z.array(z.number()),
    menu_order: z.number(),
    meta_data: z.array(
        z.object({
            id: z.number(),
            key: z.string(),
            value: z.string()
        })
    )
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    permalink: z.string(),
    type: z.enum(['simple', 'grouped', 'external', 'variable']),
    status: z.enum(['draft', 'pending', 'private', 'publish']),
    featured: z.boolean(),
    catalog_visibility: z.enum(['visible', 'catalog', 'search', 'hidden']),
    description: z.string(),
    short_description: z.string(),
    sku: z.string(),
    price: z.string(),
    regular_price: z.string(),
    sale_price: z.string().nullable().optional(),
    date_on_sale_from: z.string().nullable().optional(),
    date_on_sale_to: z.string().nullable().optional(),
    on_sale: z.boolean(),
    purchasable: z.boolean(),
    total_sales: z.number(),
    virtual: z.boolean(),
    downloadable: z.boolean(),
    download_limit: z.number().nullable().optional(),
    download_expiry: z.number().nullable().optional(),
    external_url: z.string(),
    button_text: z.string(),
    tax_status: z.enum(['taxable', 'shipping', 'none']),
    tax_class: z.string(),
    manage_stock: z.boolean(),
    stock_quantity: z.number().nullable().optional(),
    stock_status: z.enum(['instock', 'outofstock', 'onbackorder']),
    backorders: z.enum(['no', 'notify', 'yes']),
    backorders_allowed: z.boolean(),
    backordered: z.boolean(),
    sold_individually: z.boolean(),
    weight: z.string(),
    dimensions: z.object({
        length: z.string(),
        width: z.string(),
        height: z.string()
    }),
    shipping_required: z.boolean(),
    shipping_taxable: z.boolean(),
    shipping_class: z.string(),
    shipping_class_id: z.number().nullable(),
    reviews_allowed: z.boolean(),
    average_rating: z.string(),
    rating_count: z.number(),
    parent_id: z.number(),
    purchase_note: z.string(),
    categories: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            slug: z.string()
        })
    ),
    tags: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            slug: z.string()
        })
    ),
    images: z.array(
        z.object({
            id: z.number(),
            src: z.string(),
            name: z.string(),
            alt: z.string()
        })
    ),
    attributes: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            position: z.number(),
            visible: z.boolean(),
            variation: z.boolean(),
            options: z.array(z.string())
        })
    ),
    default_attributes: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            option: z.string()
        })
    ),
    variations: z.array(z.number()),
    grouped_products: z.array(z.number()),
    menu_order: z.number()
});

const action = createAction({
    description: 'Update a product in WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input['name'] !== undefined) updateData['name'] = input['name'];
        if (input['slug'] !== undefined) updateData['slug'] = input['slug'];
        if (input['type'] !== undefined) updateData['type'] = input['type'];
        if (input['status'] !== undefined) updateData['status'] = input['status'];
        if (input['featured'] !== undefined) updateData['featured'] = input['featured'];
        if (input['catalog_visibility'] !== undefined) updateData['catalog_visibility'] = input['catalog_visibility'];
        if (input['description'] !== undefined) updateData['description'] = input['description'];
        if (input['short_description'] !== undefined) updateData['short_description'] = input['short_description'];
        if (input['sku'] !== undefined) updateData['sku'] = input['sku'];
        if (input['regular_price'] !== undefined) updateData['regular_price'] = input['regular_price'];
        if (input['sale_price'] !== undefined) updateData['sale_price'] = input['sale_price'];
        if (input['date_on_sale_from'] !== undefined) updateData['date_on_sale_from'] = input['date_on_sale_from'];
        if (input['date_on_sale_to'] !== undefined) updateData['date_on_sale_to'] = input['date_on_sale_to'];
        if (input['virtual'] !== undefined) updateData['virtual'] = input['virtual'];
        if (input['downloadable'] !== undefined) updateData['downloadable'] = input['downloadable'];
        if (input['download_limit'] !== undefined) updateData['download_limit'] = input['download_limit'];
        if (input['download_expiry'] !== undefined) updateData['download_expiry'] = input['download_expiry'];
        if (input['external_url'] !== undefined) updateData['external_url'] = input['external_url'];
        if (input['button_text'] !== undefined) updateData['button_text'] = input['button_text'];
        if (input['tax_status'] !== undefined) updateData['tax_status'] = input['tax_status'];
        if (input['tax_class'] !== undefined) updateData['tax_class'] = input['tax_class'];
        if (input['manage_stock'] !== undefined) updateData['manage_stock'] = input['manage_stock'];
        if (input['stock_quantity'] !== undefined) updateData['stock_quantity'] = input['stock_quantity'];
        if (input['stock_status'] !== undefined) updateData['stock_status'] = input['stock_status'];
        if (input['backorders'] !== undefined) updateData['backorders'] = input['backorders'];
        if (input['sold_individually'] !== undefined) updateData['sold_individually'] = input['sold_individually'];
        if (input['weight'] !== undefined) updateData['weight'] = input['weight'];
        if (input['dimensions'] !== undefined) updateData['dimensions'] = input['dimensions'];
        if (input['shipping_class'] !== undefined) updateData['shipping_class'] = input['shipping_class'];
        if (input['reviews_allowed'] !== undefined) updateData['reviews_allowed'] = input['reviews_allowed'];
        if (input['parent_id'] !== undefined) updateData['parent_id'] = input['parent_id'];
        if (input['purchase_note'] !== undefined) updateData['purchase_note'] = input['purchase_note'];
        if (input['categories'] !== undefined) updateData['categories'] = input['categories'];
        if (input['tags'] !== undefined) updateData['tags'] = input['tags'];
        if (input['images'] !== undefined) updateData['images'] = input['images'];
        if (input['attributes'] !== undefined) updateData['attributes'] = input['attributes'];
        if (input['default_attributes'] !== undefined) updateData['default_attributes'] = input['default_attributes'];
        if (input['menu_order'] !== undefined) updateData['menu_order'] = input['menu_order'];
        if (input['meta_data'] !== undefined) updateData['meta_data'] = input['meta_data'];

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#update-a-product
        const response = await nango.patch({
            endpoint: `/wp-json/wc/v3/products/${encodeURIComponent(input.id)}`,
            data: updateData,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found or update failed',
                product_id: input.id
            });
        }

        const providerProduct = ProviderProductSchema.parse(response.data);

        return {
            id: providerProduct.id,
            name: providerProduct.name,
            slug: providerProduct.slug,
            permalink: providerProduct.permalink,
            type: providerProduct.type,
            status: providerProduct.status,
            featured: providerProduct.featured,
            catalog_visibility: providerProduct.catalog_visibility,
            description: providerProduct.description,
            short_description: providerProduct.short_description,
            sku: providerProduct.sku,
            price: providerProduct.price,
            regular_price: providerProduct.regular_price,
            ...(providerProduct.sale_price != null && { sale_price: providerProduct.sale_price }),
            ...(providerProduct.date_on_sale_from != null && { date_on_sale_from: providerProduct.date_on_sale_from }),
            ...(providerProduct.date_on_sale_to != null && { date_on_sale_to: providerProduct.date_on_sale_to }),
            on_sale: providerProduct.on_sale,
            purchasable: providerProduct.purchasable,
            total_sales: providerProduct.total_sales,
            virtual: providerProduct.virtual,
            downloadable: providerProduct.downloadable,
            ...(providerProduct.download_limit != null && { download_limit: providerProduct.download_limit }),
            ...(providerProduct.download_expiry != null && { download_expiry: providerProduct.download_expiry }),
            external_url: providerProduct.external_url,
            button_text: providerProduct.button_text,
            tax_status: providerProduct.tax_status,
            tax_class: providerProduct.tax_class,
            manage_stock: providerProduct.manage_stock,
            ...(providerProduct.stock_quantity != null && { stock_quantity: providerProduct.stock_quantity }),
            stock_status: providerProduct.stock_status,
            backorders: providerProduct.backorders,
            backorders_allowed: providerProduct.backorders_allowed,
            backordered: providerProduct.backordered,
            sold_individually: providerProduct.sold_individually,
            weight: providerProduct.weight,
            dimensions: providerProduct.dimensions,
            shipping_required: providerProduct.shipping_required,
            shipping_taxable: providerProduct.shipping_taxable,
            shipping_class: providerProduct.shipping_class,
            shipping_class_id: providerProduct.shipping_class_id,
            reviews_allowed: providerProduct.reviews_allowed,
            average_rating: providerProduct.average_rating,
            rating_count: providerProduct.rating_count,
            parent_id: providerProduct.parent_id,
            purchase_note: providerProduct.purchase_note,
            categories: providerProduct.categories,
            tags: providerProduct.tags,
            images: providerProduct.images.map((img) => ({
                id: img.id,
                src: img.src,
                name: img.name,
                alt: img.alt
            })),
            attributes: providerProduct.attributes,
            default_attributes: providerProduct.default_attributes,
            variations: providerProduct.variations,
            grouped_products: providerProduct.grouped_products,
            menu_order: providerProduct.menu_order
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
