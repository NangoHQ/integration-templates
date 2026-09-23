import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        smart_collection_id: z.string().describe('The unique identifier of the smart collection to update.'),
        smart_collection: z
            .object({
                title: z.string().optional().describe('The title of the smart collection.'),
                body_html: z.string().nullable().optional().describe('The HTML description of the smart collection. Pass null to clear.'),
                handle: z.string().optional().describe('The semantically unique identifier for the collection.'),
                path: z.string().optional().describe('The relative path of the collection page. Omitting leaves the current path unchanged.'),
                template_path: z
                    .string()
                    .optional()
                    .describe('The file path of the theme template for the collection page. Omitting leaves the current template unchanged.'),
                banner: z
                    .object({
                        alt: z.string().optional().describe('The alternative textual description of the collection banner.'),
                        src: z.string().optional().describe('The link to the banner image, represented as a URL.')
                    })
                    .nullable()
                    .optional()
                    .describe('The cover image of the collection. Pass null to clear.'),
                image: z
                    .object({
                        alt: z.string().optional().describe('The alternative textual description of the collection image.'),
                        src: z.string().optional().describe('The link to the collection image, represented as a URL.')
                    })
                    .nullable()
                    .optional()
                    .describe('The image of the collection. Pass null to clear.'),
                disjunctive: z.boolean().optional().describe('Whether the rules are combined with OR (true) or AND (false).'),
                sort_order: z.string().optional().describe('The sorting method of the product list on the collection page.'),
                published_scope: z.string().optional().describe('The published scope of the collection sales channels.'),
                rules: z
                    .array(
                        z
                            .object({
                                column: z.string().optional().describe('The product attribute used for filtering.'),
                                condition: z.string().optional().describe('The value to be matched.'),
                                condition_object_id: z.number().optional().describe('The ID of the metafield object.'),
                                relation: z.string().optional().describe('The relationship between the field and the value.')
                            })
                            .describe('A rule that determines which products are included in the smart collection.')
                    )
                    .optional()
                    .describe('The rules that determine which products are included in the smart collection.')
            })
            .describe('The smart collection fields to update.')
    })
    .describe('Input for updating an existing smart collection.');

const ProviderImageSchema = z.object({
    alt: z.string().optional(),
    src: z.string().optional()
});

const ProviderRuleSchema = z.object({
    column: z.string(),
    condition: z.string().optional(),
    condition_object_id: z.number().nullable().optional(),
    relation: z.string()
});

const ProviderSmartCollectionSchema = z.object({
    id: z.string(),
    title: z.string(),
    body_html: z.string().nullable().optional(),
    handle: z.string(),
    path: z.string().nullable().optional(),
    template_path: z.string().nullable().optional(),
    banner: ProviderImageSchema.nullable().optional(),
    image: ProviderImageSchema.nullable().optional(),
    disjunctive: z.boolean(),
    sort_order: z.string(),
    published_scope: z.string().nullable(),
    published_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    rules: z.array(ProviderRuleSchema).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier for the smart collection.'),
        title: z.string().describe('The title of the smart collection.'),
        body_html: z.string().optional().describe('The HTML description of the smart collection.'),
        handle: z.string().describe('The semantically unique identifier for the collection.'),
        path: z.string().optional().describe('The relative path of the collection page.'),
        template_path: z.string().optional().describe('The file path of the theme template for the collection page.'),
        banner: z
            .object({
                alt: z.string().optional().describe('The alternative textual description of the image.'),
                src: z.string().optional().describe('The link to the image, represented as a URL.')
            })
            .optional()
            .describe('The cover image of the collection.'),
        image: z
            .object({
                alt: z.string().optional().describe('The alternative textual description of the image.'),
                src: z.string().optional().describe('The link to the image, represented as a URL.')
            })
            .optional()
            .describe('The image of the collection.'),
        disjunctive: z.boolean().describe('Whether the rules are combined with OR (true) or AND (false).'),
        sort_order: z.string().describe('The sorting method of the product list on the collection page.'),
        published_scope: z.string().optional().describe('The published scope of the collection sales channels.'),
        published_at: z.string().optional().describe('The date and time when the collection was published.'),
        created_at: z.string().optional().describe('The date and time when the collection was created.'),
        updated_at: z.string().optional().describe('The date and time when the collection was last updated.'),
        rules: z
            .array(
                z
                    .object({
                        column: z.string().describe('The product attribute used for filtering.'),
                        condition: z.string().optional().describe('The value to be matched.'),
                        condition_object_id: z.number().optional().describe('The ID of the metafield object.'),
                        relation: z.string().describe('The relationship between the field and the value.')
                    })
                    .describe('A rule that determines which products are included in the smart collection.')
            )
            .optional()
            .describe('The rules that determine which products are included in the smart collection.')
    })
    .describe('The updated smart collection.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing smart collection's fields or rules via the provider API.
 * @pitfalls: Changing rules immediately recalculates collection membership. SEO details cannot be updated via this API and must be managed through metafields. path and template_path do not support clearing; omitting them or passing null leaves current values unchanged.
 */
const action = createAction({
    description: "Update a smart collection's fields or rules.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const sc = input.smart_collection;
        const payload: Record<string, unknown> = {
            ...(sc.title !== undefined && { title: sc.title }),
            ...(sc.body_html !== undefined && { body_html: sc.body_html }),
            ...(sc.handle !== undefined && { handle: sc.handle }),
            ...(sc.path !== undefined && { path: sc.path }),
            ...(sc.template_path !== undefined && { template_path: sc.template_path }),
            ...(sc.disjunctive !== undefined && { disjunctive: sc.disjunctive }),
            ...(sc.sort_order !== undefined && { sort_order: sc.sort_order }),
            ...(sc.published_scope !== undefined && { published_scope: sc.published_scope }),
            ...(sc.banner !== undefined && { banner: sc.banner }),
            ...(sc.image !== undefined && { image: sc.image }),
            ...(sc.rules !== undefined && {
                rules: sc.rules.map((rule) => ({
                    ...(rule.column !== undefined && { column: rule.column }),
                    ...(rule.condition !== undefined && { condition: rule.condition }),
                    ...(rule.condition_object_id !== undefined && { condition_object_id: rule.condition_object_id }),
                    ...(rule.relation !== undefined && { relation: rule.relation })
                }))
            })
        };

        const response = await nango.put({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/collection/update-smart-collection
            endpoint: '/admin/openapi/v20260601/products/smart_collections/' + encodeURIComponent(input.smart_collection_id) + '.json',
            data: {
                smart_collection: payload
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                smart_collection: ProviderSmartCollectionSchema
            })
            .parse(response.data);

        const collection = providerResponse.smart_collection;

        const mapImage = (img: z.infer<typeof ProviderImageSchema> | null | undefined) => {
            if (!img) {
                return undefined;
            }
            return {
                ...(typeof img.alt === 'string' && { alt: img.alt }),
                ...(typeof img.src === 'string' && { src: img.src })
            };
        };

        const mapRules = (rules: z.infer<typeof ProviderRuleSchema>[] | undefined) => {
            if (!rules) {
                return undefined;
            }
            return rules.map((rule) => ({
                column: rule.column,
                ...(typeof rule.condition === 'string' && { condition: rule.condition }),
                ...(typeof rule.condition_object_id === 'number' && { condition_object_id: rule.condition_object_id }),
                relation: rule.relation
            }));
        };

        return {
            id: collection.id,
            title: collection.title,
            handle: collection.handle,
            disjunctive: collection.disjunctive,
            sort_order: collection.sort_order,
            ...(typeof collection.published_scope === 'string' && { published_scope: collection.published_scope }),
            ...(typeof collection.body_html === 'string' && { body_html: collection.body_html }),
            ...(typeof collection.path === 'string' && { path: collection.path }),
            ...(typeof collection.template_path === 'string' && { template_path: collection.template_path }),
            ...(typeof collection.published_at === 'string' && { published_at: collection.published_at }),
            ...(typeof collection.created_at === 'string' && { created_at: collection.created_at }),
            ...(typeof collection.updated_at === 'string' && { updated_at: collection.updated_at }),
            banner: mapImage(collection.banner),
            image: mapImage(collection.image),
            rules: mapRules(collection.rules)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
