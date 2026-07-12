import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const MappedConversionType = z.enum([
    'SIGNUP',
    'ADD_TO_CART',
    'LEAD',
    'CHECKOUT',
    'SUBSCRIBE',
    'ADD_TO_WISHLIST',
    'ADD_PAYMENT_INFO',
    'INITIATE_CHECKOUT',
    'CONTACT',
    'CUSTOMIZE_PRODUCT',
    'FIND_LOCATION',
    'SCHEDULE',
    'SUBMIT_APPLICATION',
    'START_TRIAL',
    'PAGE_VISIT',
    'VIEW_CATEGORY',
    'VIEW_CONTENT',
    'SEARCH',
    'WATCH_VIDEO'
]);

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    items: z
        .array(
            z.object({
                name: z.string().describe('Raw string name of the event. Example: "newsletter_signup"'),
                mapped_conversion_type: MappedConversionType.describe(
                    'Pinterest standard event type to map this custom event to for optimization and reporting.'
                )
            })
        )
        .min(1)
        .describe('List of advertiser defined events to create. Must contain at least one item.')
});

const ProviderResponseSchema = z.object({
    items: z.array(
        z.object({
            name: z.string(),
            status: z.string(),
            exceptions: z.array(z.string()).optional()
        })
    )
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            name: z.string(),
            status: z.string(),
            exceptions: z.array(z.string()).optional()
        })
    )
});

const action = createAction({
    description: 'Create custom advertiser-defined conversion event definitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/advertiser_defined_events/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/advertiser_defined_events`,
            data: {
                items: input.items
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                name: item.name,
                status: item.status,
                ...(item.exceptions !== undefined && { exceptions: item.exceptions })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
