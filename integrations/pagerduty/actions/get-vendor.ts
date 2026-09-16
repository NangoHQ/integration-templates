import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('Vendor ID. Example: "PZQ6AUS"')
    })
    .describe('Input to retrieve a single PagerDuty vendor by ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique vendor ID.'),
        type: z.string().describe('The type of object, typically "vendor".'),
        name: z.string().describe('Vendor display name.'),
        summary: z.string().optional().describe('Short summary of the vendor.'),
        website_url: z.string().optional().describe('Vendor website URL.'),
        logo_url: z.string().optional().describe('URL to the vendor logo image.'),
        html_url: z.string().optional().describe('URL to the vendor in the PagerDuty web UI.'),
        self: z.string().optional().describe('API URL for this vendor.')
    })
    .describe('A single PagerDuty vendor returned by ID.');

const ProviderVendorSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    summary: z.string().nullable().optional(),
    website_url: z.string().nullable().optional(),
    logo_url: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    self: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    vendor: ProviderVendorSchema
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single vendor by ID from the PagerDuty API.
 */
const action = createAction({
    description: 'Retrieve a single vendor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/1ef4016b11d99-get-a-vendor
            endpoint: `/vendors/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Vendor not found for ID: ${input.id}`
            });
        }

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response shape from the PagerDuty API.'
            });
        }

        const vendor = providerResponse.data.vendor;

        return {
            id: vendor.id,
            type: vendor.type,
            name: vendor.name,
            ...(vendor.summary != null && { summary: vendor.summary }),
            ...(vendor.website_url != null && { website_url: vendor.website_url }),
            ...(vendor.logo_url != null && { logo_url: vendor.logo_url }),
            ...(vendor.html_url != null && { html_url: vendor.html_url }),
            ...(vendor.self != null && { self: vendor.self })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
