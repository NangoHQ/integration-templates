import { z } from 'zod';
import { createAction } from 'nango';

const RatingSchema = z.object({
    positive: z.boolean().describe('Whether Exist considers the relationship positive.'),
    rating_type: z.number().describe('Numeric code identifying the rating type.'),
    rating: z.string().describe('Human-readable rating, for example "Useful".')
});

const CorrelationSchema = z.object({
    date: z.string().describe('Date of the weekly correlation snapshot, in YYYY-MM-DD format.'),
    period: z.number().describe('Number of days of data used to compute the correlation.'),
    offset: z.number().describe('Day offset applied to the analysis window.'),
    attribute: z.string().describe('Name of the first attribute in the correlated pair.'),
    attribute2: z.string().describe('Name of the second attribute in the correlated pair.'),
    value: z.number().describe('Correlation coefficient between -1 and 1.'),
    p: z.number().describe('Statistical significance (p-value) of the correlation.'),
    percentage: z.number().describe('Correlation strength expressed as a percentage.'),
    stars: z.number().describe('Confidence rating from 1 to 5 stars.'),
    second_person: z.string().describe('Human-readable sentence describing the relationship.'),
    second_person_elements: z.array(z.string()).describe('Tokenized fragments of the human-readable sentence.'),
    attribute_category: z.string().nullable().describe('Sub-correlation category, or null when the pair has none.'),
    strength_description: z.string().describe('Text description of the relationship strength.'),
    stars_description: z.string().describe('Text description of the confidence rating.'),
    description: z.string().nullable().describe('Extended explanation for understood relationships, or null.'),
    occurrence: z.string().nullable().describe('How common the relationship is, or null when unavailable.'),
    rating: RatingSchema.nullable().describe('User-submitted rating of the correlation, or null when unrated.')
});

const InputSchema = z
    .object({
        attribute: z.string().describe('Name of the first attribute to correlate, for example "steps".'),
        attribute2: z.string().describe('Name of the second attribute to correlate, for example "mood".')
    })
    .describe('Input for looking up the correlation between two attributes.');

const OutputSchema = z
    .object({
        attribute: z.string().describe('Name of the first attribute that was queried.'),
        attribute2: z.string().describe('Name of the second attribute that was queried.'),
        correlation: CorrelationSchema.nullable().describe('The correlation for the pair, or null when Exist has not generated one.')
    })
    .describe('The queried attribute pair and the correlation Exist found for it, if any.');

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return false;
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return false;
    }
    return response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Reads the existing correlation between two attributes and never mutates provider data.
 * @pitfalls: A null correlation means Exist has not generated one for this pair (common on new or low-history accounts), and a pair is only returned when at least one of the two attributes is in the connection's read scopes; correlations are regenerated weekly from recent data, so an absent result may appear later.
 */
const action = createAction({
    description: 'Look up the correlation (if any) between two specific attributes.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch A missing correlation is a documented 404 for this endpoint, not a failure.
        try {
            // https://developer.exist.io/reference/correlations/#find-a-specific-correlation-combination
            const response = await nango.get({
                endpoint: '/api/2/correlations/combo/',
                params: {
                    attribute: input.attribute,
                    attribute2: input.attribute2
                },
                retries: 3
            });

            if (response.status === 404) {
                return {
                    attribute: input.attribute,
                    attribute2: input.attribute2,
                    correlation: null
                };
            }

            const correlation = CorrelationSchema.parse(response.data);

            return {
                attribute: input.attribute,
                attribute2: input.attribute2,
                correlation
            };
        } catch (error) {
            if (isNotFoundError(error)) {
                return {
                    attribute: input.attribute,
                    attribute2: input.attribute2,
                    correlation: null
                };
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
