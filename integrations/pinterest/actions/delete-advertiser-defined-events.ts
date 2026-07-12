import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    event_names: z.array(z.string()).describe('Names of the advertiser-defined events to delete. Example: ["nango_seed_delete_event_one"]')
});

const AdvertiserDefinedEventProcessingRecordSchema = z.object({
    name: z.string(),
    status: z.string(),
    exceptions: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(AdvertiserDefinedEventProcessingRecordSchema)
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
    description: 'Delete custom advertiser-defined conversion event definitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.pinterest.com/docs/api/v5/#operation/advertiser_defined_events/delete
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/advertiser_defined_events`,
            params: {
                event_names: input.event_names
            },
            retries: 3
        });

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
