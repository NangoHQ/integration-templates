import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    ad_group_id: z.string().optional().describe('Ad group ID to filter by. Either this or promotion_ids is required.'),
    promotion_ids: z.array(z.string()).optional().describe('List of product group promotion IDs to filter by. Either this or ad_group_id is required.'),
    entity_statuses: z
        .array(z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT', 'DELETED_DRAFT']))
        .optional()
        .describe('Entity statuses to filter by.'),
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Number of results per page. Maximum: 250.'),
    order: z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order by ID: ASCENDING or DESCENDING.')
});

const ProviderProductGroupPromotionSchema = z.object({
    id: z.string(),
    ad_group_id: z.string().optional(),
    catalog_product_group_id: z.string().optional(),
    catalog_product_group_name: z.string().optional(),
    bid_in_micro_currency: z.number().optional(),
    status: z.string().optional(),
    included: z.boolean().optional(),
    definition: z.string().optional(),
    relative_definition: z.string().optional(),
    parent_id: z.string().optional(),
    tracking_url: z.string().optional(),
    collections_hero_pin_id: z.string().nullable().optional(),
    collections_hero_destination_url: z.string().nullable().optional(),
    creative_type: z.string().optional(),
    customizable_cta_type: z.string().optional(),
    grid_click_type: z.string().optional(),
    is_mdl: z.boolean().optional(),
    is_generate_background: z.boolean().nullable().optional(),
    is_image_auto_resizing: z.boolean().nullable().optional(),
    preferred_media_type: z.string().optional(),
    selected_image_tag: z.string().nullable().optional(),
    selected_video_tag: z.string().nullable().optional(),
    slideshow_collections_title: z.string().nullable().optional(),
    slideshow_collections_description: z.string().nullable().optional()
});

const ProductGroupPromotionSchema = z.object({
    id: z.string(),
    ad_group_id: z.string().optional(),
    catalog_product_group_id: z.string().optional(),
    catalog_product_group_name: z.string().optional(),
    bid_in_micro_currency: z.number().optional(),
    status: z.string().optional(),
    included: z.boolean().optional(),
    definition: z.string().optional(),
    relative_definition: z.string().optional(),
    parent_id: z.string().optional(),
    tracking_url: z.string().optional(),
    collections_hero_pin_id: z.string().optional(),
    collections_hero_destination_url: z.string().optional(),
    creative_type: z.string().optional(),
    customizable_cta_type: z.string().optional(),
    grid_click_type: z.string().optional(),
    is_mdl: z.boolean().optional(),
    is_generate_background: z.boolean().optional(),
    is_image_auto_resizing: z.boolean().optional(),
    preferred_media_type: z.string().optional(),
    selected_image_tag: z.string().optional(),
    selected_video_tag: z.string().optional(),
    slideshow_collections_title: z.string().optional(),
    slideshow_collections_description: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProductGroupPromotionSchema),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.object({
    bookmark: z.string().nullable().optional(),
    items: z.array(z.unknown())
});

const action = createAction({
    description: 'List product-group-level promotion overrides.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input) => {
        if (!input.ad_group_id && (!input.promotion_ids || input.promotion_ids.length === 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either ad_group_id or promotion_ids is required.'
            });
        }

        // https://developers.pinterest.com/docs/api/v5/#operation/product_group_promotions/list
        const response = await nango.get({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/product_group_promotions`,
            params: {
                ...(input.ad_group_id !== undefined && { ad_group_id: input.ad_group_id }),
                ...(input.promotion_ids !== undefined && input.promotion_ids.length > 0 && { product_group_promotion_ids: input.promotion_ids.join(',') }),
                ...(input.entity_statuses !== undefined && input.entity_statuses.length > 0 && { entity_statuses: input.entity_statuses.join(',') }),
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.order !== undefined && { order: input.order })
            },
            retries: 3
        });

        const parsed = ListResponseSchema.parse(response.data);

        return {
            items: parsed.items.map((item) => {
                const p = ProviderProductGroupPromotionSchema.parse(item);
                return {
                    id: p.id,
                    ...(p.ad_group_id !== undefined && { ad_group_id: p.ad_group_id }),
                    ...(p.catalog_product_group_id !== undefined && { catalog_product_group_id: p.catalog_product_group_id }),
                    ...(p.catalog_product_group_name !== undefined && { catalog_product_group_name: p.catalog_product_group_name }),
                    ...(p.bid_in_micro_currency !== undefined && { bid_in_micro_currency: p.bid_in_micro_currency }),
                    ...(p.status !== undefined && { status: p.status }),
                    ...(p.included !== undefined && { included: p.included }),
                    ...(p.definition !== undefined && { definition: p.definition }),
                    ...(p.relative_definition !== undefined && { relative_definition: p.relative_definition }),
                    ...(p.parent_id !== undefined && { parent_id: p.parent_id }),
                    ...(p.tracking_url !== undefined && { tracking_url: p.tracking_url }),
                    ...(p.collections_hero_pin_id !== undefined &&
                        p.collections_hero_pin_id !== null && { collections_hero_pin_id: p.collections_hero_pin_id }),
                    ...(p.collections_hero_destination_url !== undefined &&
                        p.collections_hero_destination_url !== null && { collections_hero_destination_url: p.collections_hero_destination_url }),
                    ...(p.creative_type !== undefined && { creative_type: p.creative_type }),
                    ...(p.customizable_cta_type !== undefined && { customizable_cta_type: p.customizable_cta_type }),
                    ...(p.grid_click_type !== undefined && { grid_click_type: p.grid_click_type }),
                    ...(p.is_mdl !== undefined && { is_mdl: p.is_mdl }),
                    ...(p.is_generate_background !== undefined && p.is_generate_background !== null && { is_generate_background: p.is_generate_background }),
                    ...(p.is_image_auto_resizing !== undefined && p.is_image_auto_resizing !== null && { is_image_auto_resizing: p.is_image_auto_resizing }),
                    ...(p.preferred_media_type !== undefined && { preferred_media_type: p.preferred_media_type }),
                    ...(p.selected_image_tag !== undefined && p.selected_image_tag !== null && { selected_image_tag: p.selected_image_tag }),
                    ...(p.selected_video_tag !== undefined && p.selected_video_tag !== null && { selected_video_tag: p.selected_video_tag }),
                    ...(p.slideshow_collections_title !== undefined &&
                        p.slideshow_collections_title !== null && { slideshow_collections_title: p.slideshow_collections_title }),
                    ...(p.slideshow_collections_description !== undefined &&
                        p.slideshow_collections_description !== null && { slideshow_collections_description: p.slideshow_collections_description })
                };
            }),
            ...(parsed.bookmark !== undefined && parsed.bookmark !== null && { next_cursor: parsed.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
