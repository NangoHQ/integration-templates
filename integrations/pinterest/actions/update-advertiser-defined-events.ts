import { z } from 'zod';
import { createAction } from 'nango';

const AdvertiserDefinedEventInputSchema = z.object({
    name: z.string().describe('Raw string name of the event. Example: "newsletter_signup"'),
    mapped_conversion_type: z
        .enum([
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
        ])
        .describe('Pinterest standard event type to map this custom event to for campaign optimization and reporting. Example: "CHECKOUT"')
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    items: z.array(AdvertiserDefinedEventInputSchema).min(1).describe('List of advertiser defined events to update')
});

const ProviderProcessingRecordSchema = z.object({
    name: z.string(),
    status: z.string(),
    exceptions: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderProcessingRecordSchema).describe('Processing records for each updated event')
});

const action = createAction({
    description: 'Update custom advertiser-defined conversion event definitions',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.pinterest.com/docs/api/v5/#operation/advertiser_defined_events/update
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/advertiser_defined_events`,
            data: {
                items: input.items
            },
            retries: 10
        });

        const providerResponse = z
            .object({
                items: z.array(ProviderProcessingRecordSchema)
            })
            .parse(response.data);

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
