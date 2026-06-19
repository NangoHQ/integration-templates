import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ReportSchema = z.object({
    slug: z.string(),
    description: z.string(),
    _links: z
        .object({
            self: z.array(z.object({ href: z.string() })),
            collection: z.array(z.object({ href: z.string() }))
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(ReportSchema)
});

const action = createAction({
    description: 'List available WooCommerce reports.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-reports
            endpoint: '/wp-json/wc/v3/reports',
            retries: 3
        });

        const providerReports = z.array(ReportSchema).parse(response.data);

        return {
            items: providerReports
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
