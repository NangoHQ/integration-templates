import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    propertyId: z.string().describe('GA4 property ID. Use "0" for universal metadata. Example: "123456789"')
});

const DimensionSchema = z.object({
    apiName: z.string(),
    uiName: z.string(),
    description: z.string(),
    category: z.string(),
    deprecatedApiNames: z.array(z.string()).optional()
});

const MetricSchema = z.object({
    apiName: z.string(),
    uiName: z.string(),
    description: z.string(),
    type: z.string(),
    category: z.string(),
    deprecatedApiNames: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    name: z.string(),
    dimensions: z.array(DimensionSchema),
    metrics: z.array(MetricSchema)
});

const action = createAction({
    description: 'Retrieve GA4 dimensions and metrics metadata.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-metadata',
        group: 'Reporting'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/getMetadata
            endpoint: `/v1beta/properties/${encodeURIComponent(input.propertyId)}/metadata`,
            retries: 3,
            baseUrlOverride: 'https://analyticsdata.googleapis.com'
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Metadata not found for the specified property.'
            });
        }

        const providerResponse = OutputSchema.parse(response.data);
        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
