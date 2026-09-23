import { z } from 'zod';
import { createAction } from 'nango';

const SmartCollectionRuleSchema = z
    .object({
        column: z.string().describe('The product property to filter on. Example: "vendor"'),
        relation: z.string().describe('The comparison operator for the rule. Example: "equals"'),
        condition: z.string().describe('The value to match against the column. Example: "Nango Test"'),
        condition_object_id: z.string().optional().describe('The ID of the object the condition refers to, if applicable.')
    })
    .describe('A rule that defines which products are included in the smart collection.');

const SmartCollectionInputSchema = z
    .object({
        smart_collection: z
            .object({
                title: z.string().describe('The title of the smart collection. Example: "Nango Test Smart Collection"'),
                rules: z.array(SmartCollectionRuleSchema).describe('The rules that determine which products are included in the smart collection.'),
                banner: z.string().optional().describe('The banner image URL for the smart collection.'),
                body_html: z.string().optional().describe('The HTML body content for the smart collection description.'),
                disjunctive: z.boolean().optional().describe('Whether to use OR logic (true) or AND logic (false) across all rules. Defaults to true.'),
                handle: z.string().optional().describe('A unique, human-readable string for the smart collection URL.'),
                image: z
                    .object({
                        src: z.string().describe('The URL of the image.')
                    })
                    .optional()
                    .describe('The image associated with the smart collection.'),
                path: z.string().optional().describe('The URL path for the smart collection.'),
                published_scope: z.string().optional().describe('The scope of publication. Example: "global" or "web".'),
                sort_order: z.string().optional().describe('The sort order for products in the collection. Example: "manual" or "best-selling".'),
                template_path: z.string().optional().describe('The template path used to render the collection page.')
            })
            .describe('The smart collection to create.')
    })
    .describe('Input for creating a smart collection on SHOPLINE.');

const SmartCollectionOutputSchema = z
    .object({
        smart_collection: z
            .object({
                id: z.string().describe('The unique identifier of the smart collection.'),
                title: z.string().describe('The title of the smart collection.'),
                rules: z.array(SmartCollectionRuleSchema).describe('The rules that determine product membership.'),
                disjunctive: z.boolean().describe('Whether the collection uses OR logic across rules.'),
                handle: z.string().optional().describe('A unique, human-readable string for the collection URL.'),
                banner: z.string().optional().describe('The banner image URL.'),
                body_html: z.string().optional().describe('The HTML body content.'),
                image: z
                    .object({
                        src: z.string().optional().describe('The URL of the image.')
                    })
                    .optional()
                    .describe('The image associated with the collection.'),
                path: z.string().optional().describe('The URL path for the collection.'),
                published_scope: z.string().optional().describe('The publication scope.'),
                sort_order: z.string().optional().describe('The sort order for products in the collection.'),
                template_path: z.string().optional().describe('The template path used to render the collection page.'),
                updated_at: z.string().optional().describe('The ISO 8601 timestamp when the collection was last updated.'),
                created_at: z.string().optional().describe('The ISO 8601 timestamp when the collection was created.')
            })
            .describe('The created smart collection.')
    })
    .describe('Output of creating a smart collection on SHOPLINE.');

/**
 * @tags: [write]
 * @tagReason: Creates a new smart collection on the SHOPLINE store.
 * @pitfalls: Smart collections have no product membership endpoints; inclusion is determined solely by rules and cannot be manually edited after creation, so use manual collections for fixed membership.
 */
const action = createAction({
    description: 'Create a smart collection with membership rules.',
    version: '1.0.0',
    input: SmartCollectionInputSchema,
    output: SmartCollectionOutputSchema,
    scopes: ['read_products', 'write_products'],

    exec: async (nango, input): Promise<z.infer<typeof SmartCollectionOutputSchema>> => {
        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/smart-collections/create-smart-collection
            endpoint: '/admin/openapi/v20260601/products/smart_collections.json',
            data: input,
            retries: 3
        });

        const providerData = z
            .object({
                smart_collection: z.object({
                    id: z.string(),
                    title: z.string(),
                    rules: z.array(
                        z.object({
                            column: z.string(),
                            relation: z.string(),
                            condition: z.string(),
                            condition_object_id: z.string().optional().nullable()
                        })
                    ),
                    disjunctive: z.boolean(),
                    handle: z.string().optional().nullable(),
                    banner: z.string().optional().nullable(),
                    body_html: z.string().optional().nullable(),
                    image: z
                        .object({
                            src: z.string().optional().nullable()
                        })
                        .optional()
                        .nullable(),
                    path: z.string().optional().nullable(),
                    published_scope: z.string().optional().nullable(),
                    sort_order: z.string().optional().nullable(),
                    template_path: z.string().optional().nullable(),
                    updated_at: z.string().optional().nullable(),
                    created_at: z.string().optional().nullable()
                })
            })
            .parse(response.data);

        const sc = providerData.smart_collection;

        return {
            smart_collection: {
                id: sc.id,
                title: sc.title,
                rules: sc.rules.map((rule) => ({
                    column: rule.column,
                    relation: rule.relation,
                    condition: rule.condition,
                    ...(rule.condition_object_id != null && { condition_object_id: rule.condition_object_id })
                })),
                disjunctive: sc.disjunctive,
                ...(sc.handle != null && { handle: sc.handle }),
                ...(sc.banner != null && { banner: sc.banner }),
                ...(sc.body_html != null && { body_html: sc.body_html }),
                ...(sc.image != null && {
                    image: {
                        ...(sc.image.src != null && { src: sc.image.src })
                    }
                }),
                ...(sc.path != null && { path: sc.path }),
                ...(sc.published_scope != null && { published_scope: sc.published_scope }),
                ...(sc.sort_order != null && { sort_order: sc.sort_order }),
                ...(sc.template_path != null && { template_path: sc.template_path }),
                ...(sc.updated_at != null && { updated_at: sc.updated_at }),
                ...(sc.created_at != null && { created_at: sc.created_at })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
