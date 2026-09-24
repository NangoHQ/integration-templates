import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start: z.string().describe('First date included in data series, formatted YYYYMMDD. Example: "20221001"'),
        end: z.string().describe('Last date included in data series, formatted YYYYMMDD. Example: "20221001"'),
        p: z
            .string()
            .describe(
                'The property to get the composition of. For built-in Amplitude properties use values like version, country, city, region, DMA, language, platform, os, device, start_version, or paying. For custom-defined user properties format as gp:name. For group properties format as gp:group_type:property.'
            )
    })
    .describe('Input to query the distribution of users across values of a user or group property.');

const CompositionValueSchema = z.object({
    value: z.string().describe('A value the chosen property can take.'),
    count: z.number().describe('The number of unique users who had this property value in the specified date range.')
});

const OutputSchema = z
    .object({
        property: z.string().describe('The user property the chart displays.'),
        distribution: z.array(CompositionValueSchema).describe('The distribution of users across values of the property.')
    })
    .describe('Output containing the user property and the distribution of users across its values.');

const ProviderResponseSchema = z.object({
    data: z.object({
        series: z.array(z.array(z.number())),
        seriesLabels: z.array(z.string()),
        xValues: z.array(z.string())
    })
});

/**
 * @tags: [read]
 * @tagReason: Reads the distribution of users across property values from Amplitude analytics.
 * @pitfalls: Start dates before a rolling cutoff return 403 "Date too far back". Built-in property names may still fail with 400 "Invalid user property" if they are not configured for the project.
 */
const action = createAction({
    description: 'Get the distribution of users across the values of a user or group property.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/dashboard-rest
        const response = await nango.get({
            endpoint: '/api/2/composition',
            params: {
                start: input.start,
                end: input.end,
                p: input.p
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response shape.',
                details: parsed.error.flatten()
            });
        }

        const data = parsed.data.data;
        const counts = data.series[0] || [];
        const values = data.xValues || [];

        const distribution = values.map((value, index) => ({
            value,
            count: counts[index] || 0
        }));

        return {
            property: data.seriesLabels[0] || input.p,
            distribution
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
