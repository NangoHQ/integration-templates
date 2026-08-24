import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        external_ids: z
            .array(z.string().describe('External product ID, typically the Shopify product ID. Example: "10291926270247"'))
            .describe('One or more external product IDs to fetch review widgets for.')
    })
    .describe('Input for fetching product review widgets.');

const ProviderWidgetSchema = z.object({
    product_external_id: z.number(),
    widget: z.string()
});

const WidgetSchema = z.object({
    product_external_id: z.number().describe('The external product ID that the widget belongs to.'),
    widget: z.string().describe('XSS-safe, ready-to-render review widget HTML for the product.')
});

const OutputSchema = z
    .object({
        widgets: z.array(WidgetSchema).describe('Review widgets for the requested products, in the same order as the input IDs.')
    })
    .describe('Output containing product review widgets.');

/**
 * @tags: [read]
 * @tagReason: Reads widget HTML from the provider; no provider-side state is modified.
 * @pitfalls: Multiple product IDs trigger sequential provider requests because the endpoint only returns one widget per call.
 */
const action = createAction({
    description: 'Fetch the ready-to-render review widget/badge HTML for one or more products.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_widgets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.external_ids.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'external_ids must contain at least one product ID.'
            });
        }

        const widgets: z.infer<typeof WidgetSchema>[] = [];

        for (const externalId of input.external_ids) {
            const response = await nango.get({
                // https://judge.me/api/docs
                endpoint: '/api/v1/widgets/product_review',
                params: {
                    external_id: externalId
                },
                retries: 3
            });

            const data = ProviderWidgetSchema.parse(response.data);

            widgets.push({
                product_external_id: data.product_external_id,
                widget: data.widget
            });
        }

        return { widgets };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
