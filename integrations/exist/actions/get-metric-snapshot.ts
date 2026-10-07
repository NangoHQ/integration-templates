import { z } from 'zod';
import { createAction } from 'nango';

const AttributeValueSchema = z.object({
    date: z.string().describe('Date of the value in YYYY-MM-DD format.'),
    value: z
        .union([z.number(), z.string(), z.boolean(), z.null()])
        .describe('Recorded value; numeric, string, boolean, or null depending on the attribute value type.')
});

const CorrelationRatingSchema = z.object({
    positive: z.boolean().describe('Whether the relationship is positive.'),
    rating_type: z.number().describe('Numeric rating type identifier.'),
    rating: z.string().describe('Human-readable usefulness rating.')
});

const CorrelationSchema = z.object({
    date: z.string().describe('Date the correlation was computed, in YYYY-MM-DD format.'),
    period: z.number().describe('Number of days the correlation was computed over.'),
    offset: z.number().describe('Day offset between the two attributes.'),
    attribute: z.string().describe('Name of the first correlated attribute.'),
    attribute2: z.string().describe('Name of the second correlated attribute.'),
    value: z.number().describe('Correlation coefficient between the two attributes.'),
    p: z.number().describe('Statistical p-value of the correlation.'),
    percentage: z.number().describe('Correlation strength as a percentage.'),
    stars: z.number().describe('Confidence rating from 1 to 5 stars.'),
    second_person: z.string().describe('Human-readable sentence describing the relationship.'),
    second_person_elements: z.array(z.string()).describe('Sentence fragments used to build the human-readable description.'),
    attribute_category: z.string().nullable().optional().describe('Optional category label for the attribute, or null when unset.'),
    strength_description: z.string().describe('Human-readable strength label.'),
    stars_description: z.string().describe('Human-readable confidence label.'),
    description: z.string().nullable().optional().describe('Optional longer description of the correlation, or null when unset.'),
    occurrence: z.string().nullable().optional().describe('Optional occurrence information, or null when unset.'),
    rating: CorrelationRatingSchema.nullable().optional().describe('Optional usefulness rating for the correlation, or null when unset.')
});

const AverageSchema = z.object({
    attribute: z.string().describe('Name of the attribute the averages belong to.'),
    date: z.string().describe('Week date the averages were computed for, in YYYY-MM-DD format.'),
    overall: z.number().nullable().describe('Average value across the whole week.'),
    monday: z.number().nullable().describe('Average value for Monday.'),
    tuesday: z.number().nullable().describe('Average value for Tuesday.'),
    wednesday: z.number().nullable().describe('Average value for Wednesday.'),
    thursday: z.number().nullable().describe('Average value for Thursday.'),
    friday: z.number().nullable().describe('Average value for Friday.'),
    saturday: z.number().nullable().describe('Average value for Saturday.'),
    sunday: z.number().nullable().describe('Average value for Sunday.')
});

const WithValuesResponseSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(
        z.object({
            name: z.string(),
            values: z.array(AttributeValueSchema)
        })
    )
});

const CorrelationsResponseSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(CorrelationSchema)
});

const AveragesResponseSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(AverageSchema)
});

const InputSchema = z
    .object({
        name: z.string().describe('Name of the attribute (metric) to snapshot. Example: "steps"'),
        days: z.number().int().min(1).max(31).optional().describe('Number of recent days of values to include, from 1 to 31. Defaults to 7.')
    })
    .describe('Input for getting a consolidated snapshot of a single metric.');

const OutputSchema = z
    .object({
        attribute: z.string().describe('Name of the attribute the snapshot describes.'),
        recent_values: z.array(AttributeValueSchema).describe('Recent daily values for the attribute, as returned by the provider.'),
        correlations: z.array(CorrelationSchema).describe("Correlations involving this attribute from the provider's rolling last-week snapshot."),
        averages: z.array(AverageSchema).describe('Recent weekly averages for the attribute.')
    })
    .describe('Consolidated snapshot of a single metric.');

/**
 * @tags: [read]
 * @tagReason: Only performs provider reads (attribute values, correlations, and averages); it never mutates provider data.
 * @pitfalls: An inactive or unowned attribute returns empty recent_values even though its history still exists and reappears after re-acquiring it; correlations cover only the current rolling week rather than accumulated history; a freshly created attribute may already carry an auto-seeded today value that was never explicitly written; days is capped at 31 by the provider.
 */
const action = createAction({
    description:
        "COMPOSITE: get a consolidated view of one metric - its recent values, this week's correlations involving it, and its recent weekly averages - in a single call.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const days = input.days ?? 7;

        const [withValuesResponse, correlationsResponse, averagesResponse] = await Promise.all([
            nango.get({
                // https://developer.exist.io/reference/attributes/#get-attributes-with-values
                endpoint: '/api/2/attributes/with-values/',
                params: {
                    attributes: input.name,
                    days
                },
                retries: 3
            }),
            nango.get({
                // https://developer.exist.io/reference/correlations/#get-all-correlations
                endpoint: '/api/2/correlations/',
                params: {
                    attribute: input.name
                },
                retries: 3
            }),
            nango.get({
                // https://developer.exist.io/reference/averages/#get-averages
                endpoint: '/api/2/averages/',
                params: {
                    attributes: input.name
                },
                retries: 3
            })
        ]);

        const withValues = WithValuesResponseSchema.parse(withValuesResponse.data);
        const correlations = CorrelationsResponseSchema.parse(correlationsResponse.data);
        const averages = AveragesResponseSchema.parse(averagesResponse.data);

        const attribute = withValues.results[0];

        return {
            attribute: input.name,
            recent_values: attribute ? attribute.values : [],
            correlations: correlations.results,
            averages: averages.results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
