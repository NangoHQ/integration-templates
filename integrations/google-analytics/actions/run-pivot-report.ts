import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    property: z.string().describe('Google Analytics property numeric ID. Example: 535258304'),
    dimensions: z.array(z.record(z.string(), z.unknown())).optional(),
    metrics: z.array(z.record(z.string(), z.unknown())).optional(),
    dateRanges: z.array(z.record(z.string(), z.unknown())).optional(),
    pivots: z.array(z.record(z.string(), z.unknown())).optional(),
    dimensionFilter: z.record(z.string(), z.unknown()).optional(),
    metricFilter: z.record(z.string(), z.unknown()).optional(),
    currencyCode: z.string().optional(),
    cohortSpec: z.record(z.string(), z.unknown()).optional(),
    keepEmptyRows: z.boolean().optional(),
    returnPropertyQuota: z.boolean().optional(),
    comparisons: z.array(z.record(z.string(), z.unknown())).optional()
});

const OutputSchema = z
    .object({
        pivotHeaders: z.array(z.record(z.string(), z.unknown())).optional(),
        dimensionHeaders: z.array(z.record(z.string(), z.unknown())).optional(),
        metricHeaders: z.array(z.record(z.string(), z.unknown())).optional(),
        rows: z.array(z.record(z.string(), z.unknown())).optional(),
        aggregates: z.array(z.record(z.string(), z.unknown())).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        propertyQuota: z.record(z.string(), z.unknown()).optional(),
        kind: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Run a GA4 pivot report.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/run-pivot-report',
        group: 'Reporting'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { property, ...requestBody } = input;

        const response = await nango.post({
            // https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runPivotReport
            endpoint: `/v1beta/properties/${encodeURIComponent(property)}:runPivotReport`,
            data: requestBody,
            baseUrlOverride: 'https://analyticsdata.googleapis.com',
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
