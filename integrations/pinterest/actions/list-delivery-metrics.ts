import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    entity_type: z.string().describe('Entity type to filter metric definitions. Example: "CAMPAIGN", "AD_GROUP", "AD", "PIN_PROMOTION"')
});

const DeliveryMetricSchema = z.object({
    name: z.string(),
    category: z.enum(['ADS', 'ORGANIC']),
    definition: z.string(),
    display_name: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(DeliveryMetricSchema)
});

const action = createAction({
    description: 'List available analytics metric definitions',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/delivery_metrics/get
            endpoint: '/v5/resources/delivery_metrics',
            params: {
                entity_type: input.entity_type
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
