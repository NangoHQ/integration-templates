import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    property_id: z.string().describe('GA4 property numeric ID. Example: "12345"'),
    conversion_event_id: z.string().describe('Conversion event numeric ID. Example: "67890"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    name: z.string().describe('Resource name of the archived conversion event.')
});

const action = createAction({
    description: 'Archive a GA4 conversion event.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['analytics.edit'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const name = `properties/${input.property_id}/conversionEvents/${input.conversion_event_id}`;

        await nango.delete({
            // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.conversionEvents/delete
            endpoint: `/v1beta/properties/${encodeURIComponent(input.property_id)}/conversionEvents/${encodeURIComponent(input.conversion_event_id)}`,
            baseUrlOverride: 'https://analyticsadmin.googleapis.com',
            retries: 3
        });

        return {
            success: true,
            name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
