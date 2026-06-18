import { z } from 'zod';
import { createAction } from 'nango';

const CategoryInputSchema = z.object({
    id: z.number().describe('Category ID. Example: 9')
});

const TagInputSchema = z.object({
    id: z.number().describe('Tag ID. Example: 19')
});

const ImageInputSchema = z.object({
    id: z.number().optional().describe('Attachment ID from the Media Library.'),
    src: z.string().optional().describe('Image URL.')
});

const DimensionInputSchema = z.object({
    length: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional()
});

const AttributeInputSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    position: z.number().optional(),
    visible: z.boolean().optional(),
    variation: z.boolean().optional(),
    options: z.array(z.string()).optional()
});

const DefaultAttributeInputSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    option: z.string().optional()
});

const MetaDataInputSchema = z.object({
    key: z.string().optional(),
    value: z.string().optional()
});

const InputSchema = z.object({
    name: z.string().describe('Product name.'),
    type: z.enum(['simple', 'grouped', 'external', 'variable']).optional().describe('Product type. Default: simple'),
    status: z.enum(['draft', 'pending', 'private', 'publish']).optional().describe('Product status. Default: publish'),
    featured: z.boolean().optional().describe('Featured product. Default: false'),
    catalog_visibility: z.enum(['visible', 'catalog', 'search', 'hidden']).optional().describe('Catalog visibility. Default: visible'),
    description: z.string().optional().describe('Product description.'),
    short_description: z.string().optional().describe('Product short description.'),
    sku: z.string().optional().describe('Unique identifier.'),
    regular_price: z.string().optional().describe('Product regular price.'),
    sale_price: z.string().optional().describe('Product sale price.'),
    categories: z.array(CategoryInputSchema).optional().describe('List of categories.'),
    tags: z.array(TagInputSchema).optional().describe('List of tags.'),
    images: z.array(ImageInputSchema).optional().describe('List of images.'),
    attributes: z.array(AttributeInputSchema).optional().describe('List of attributes.'),
    default_attributes: z.array(DefaultAttributeInputSchema).optional().describe('Default variation attributes.'),
    stock_status: z.enum(['instock', 'outofstock', 'onbackorder']).optional().describe('Stock status. Default: instock'),
    manage_stock: z.boolean().optional().describe('Stock management at product level. Default: false'),
    stock_quantity: z.number().optional().describe('Stock quantity.'),
    weight: z.string().optional().describe('Product weight.'),
    dimensions: DimensionInputSchema.optional().describe('Product dimensions.'),
    virtual: z.boolean().optional().describe('If the product is virtual. Default: false'),
    downloadable: z.boolean().optional().describe('If the product is downloadable. Default: false'),
    tax_status: z.enum(['taxable', 'shipping', 'none']).optional().describe('Tax status. Default: taxable'),
    tax_class: z.string().optional().describe('Tax class.'),
    external_url: z.string().optional().describe('Product external URL. Only for external products.'),
    button_text: z.string().optional().describe('Product external button text. Only for external products.'),
    upsell_ids: z.array(z.number()).optional().describe('List of up-sell product IDs.'),
    cross_sell_ids: z.array(z.number()).optional().describe('List of cross-sell product IDs.'),
    grouped_products: z.array(z.number()).optional().describe('List of grouped product IDs.'),
    parent_id: z.number().optional().describe('Product parent ID.'),
    purchase_note: z.string().optional().describe('Optional note to send the customer after purchase.'),
    reviews_allowed: z.boolean().optional().describe('Allow reviews. Default: true'),
    menu_order: z.number().optional().describe('Menu order.'),
    meta_data: z.array(MetaDataInputSchema).optional().describe('Meta data.')
});

const CategoryOutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    slug: z.string().optional()
});

const TagOutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    slug: z.string().optional()
});

const ImageOutputSchema = z.object({
    id: z.number(),
    src: z.string().optional(),
    name: z.string().optional(),
    alt: z.string().optional()
});

const DimensionOutputSchema = z.object({
    length: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional()
});

const AttributeOutputSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    position: z.number().optional(),
    visible: z.boolean().optional(),
    variation: z.boolean().optional(),
    options: z.array(z.string()).optional()
});

const DefaultAttributeOutputSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    option: z.string().optional()
});

const MetaDataOutputSchema = z.object({
    id: z.number().optional(),
    key: z.string().optional(),
    value: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('Unique identifier for the resource.'),
    name: z.string().optional(),
    slug: z.string().optional(),
    permalink: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    featured: z.boolean().optional(),
    catalog_visibility: z.string().optional(),
    description: z.string().optional(),
    short_description: z.string().optional(),
    sku: z.string().optional(),
    price: z.string().optional(),
    regular_price: z.string().optional(),
    sale_price: z.string().optional(),
    on_sale: z.boolean().optional(),
    purchasable: z.boolean().optional(),
    virtual: z.boolean().optional(),
    downloadable: z.boolean().optional(),
    tax_status: z.string().optional(),
    tax_class: z.string().optional(),
    manage_stock: z.boolean().optional(),
    stock_quantity: z.number().nullable().optional(),
    stock_status: z.string().optional(),
    weight: z.string().optional(),
    dimensions: DimensionOutputSchema.optional(),
    shipping_required: z.boolean().optional(),
    shipping_taxable: z.boolean().optional(),
    shipping_class: z.string().optional(),
    shipping_class_id: z.number().optional(),
    reviews_allowed: z.boolean().optional(),
    average_rating: z.string().optional(),
    rating_count: z.number().optional(),
    parent_id: z.number().optional(),
    purchase_note: z.string().optional(),
    categories: z.array(CategoryOutputSchema).optional(),
    tags: z.array(TagOutputSchema).optional(),
    images: z.array(ImageOutputSchema).optional(),
    attributes: z.array(AttributeOutputSchema).optional(),
    default_attributes: z.array(DefaultAttributeOutputSchema).optional(),
    variations: z.array(z.number()).optional(),
    grouped_products: z.array(z.number()).optional(),
    menu_order: z.number().optional(),
    meta_data: z.array(MetaDataOutputSchema).optional()
});

const action = createAction({
    description: 'Create a product in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#create-a-product
            endpoint: '/wp-json/wc/v3/products',
            data: {
                name: input.name,
                ...(input.type !== undefined && { type: input.type }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.featured !== undefined && { featured: input.featured }),
                ...(input.catalog_visibility !== undefined && { catalog_visibility: input.catalog_visibility }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.short_description !== undefined && { short_description: input.short_description }),
                ...(input.sku !== undefined && { sku: input.sku }),
                ...(input.regular_price !== undefined && { regular_price: input.regular_price }),
                ...(input.sale_price !== undefined && { sale_price: input.sale_price }),
                ...(input.categories !== undefined && { categories: input.categories }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.images !== undefined && { images: input.images }),
                ...(input.attributes !== undefined && { attributes: input.attributes }),
                ...(input.default_attributes !== undefined && { default_attributes: input.default_attributes }),
                ...(input.stock_status !== undefined && { stock_status: input.stock_status }),
                ...(input.manage_stock !== undefined && { manage_stock: input.manage_stock }),
                ...(input.stock_quantity !== undefined && { stock_quantity: input.stock_quantity }),
                ...(input.weight !== undefined && { weight: input.weight }),
                ...(input.dimensions !== undefined && { dimensions: input.dimensions }),
                ...(input.virtual !== undefined && { virtual: input.virtual }),
                ...(input.downloadable !== undefined && { downloadable: input.downloadable }),
                ...(input.tax_status !== undefined && { tax_status: input.tax_status }),
                ...(input.tax_class !== undefined && { tax_class: input.tax_class }),
                ...(input.external_url !== undefined && { external_url: input.external_url }),
                ...(input.button_text !== undefined && { button_text: input.button_text }),
                ...(input.upsell_ids !== undefined && { upsell_ids: input.upsell_ids }),
                ...(input.cross_sell_ids !== undefined && { cross_sell_ids: input.cross_sell_ids }),
                ...(input.grouped_products !== undefined && { grouped_products: input.grouped_products }),
                ...(input.parent_id !== undefined && { parent_id: input.parent_id }),
                ...(input.purchase_note !== undefined && { purchase_note: input.purchase_note }),
                ...(input.reviews_allowed !== undefined && { reviews_allowed: input.reviews_allowed }),
                ...(input.menu_order !== undefined && { menu_order: input.menu_order }),
                ...(input.meta_data !== undefined && { meta_data: input.meta_data })
            },
            retries: 3
        });

        const providerProduct = OutputSchema.parse(response.data);
        return providerProduct;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
