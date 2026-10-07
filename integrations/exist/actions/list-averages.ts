import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        page: z.number().int().positive().optional().describe('Page number to retrieve, starting at 1. Defaults to 1.'),
        limit: z.number().int().positive().max(100).optional().describe('Maximum number of average records to return per page (1-100).'),
        date_min: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Oldest date to include, inclusive, in YYYY-MM-DD format. Example: "2020-01-01".'),
        date_max: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Most recent date to include, inclusive, in YYYY-MM-DD format. Example: "2020-12-31".'),
        groups: z.array(z.string()).optional().describe('Attribute groups to filter by. Example: ["activity", "workouts"].'),
        attributes: z.array(z.string()).optional().describe('Attribute names to filter by. Example: ["steps", "floors"].'),
        include_historical: z.boolean().optional().describe('When true, returns historical weekly averages instead of only the most recent week per attribute.')
    })
    .describe('Filters for listing weekly average values per attribute.');

const AverageSchema = z.object({
    attribute: z.string().describe('Name of the attribute these averages describe. Example: "steps".'),
    date: z.string().describe('Date the weekly average was recorded, in YYYY-MM-DD format.'),
    overall: z.number().nullable().describe('Average value across the whole week.'),
    monday: z.number().nullable().describe('Average value for Monday.'),
    tuesday: z.number().nullable().describe('Average value for Tuesday.'),
    wednesday: z.number().nullable().describe('Average value for Wednesday.'),
    thursday: z.number().nullable().describe('Average value for Thursday.'),
    friday: z.number().nullable().describe('Average value for Friday.'),
    saturday: z.number().nullable().describe('Average value for Saturday.'),
    sunday: z.number().nullable().describe('Average value for Sunday.')
});

const OutputSchema = z
    .object({
        count: z.number().describe('Total number of weekly average records matching the filters.'),
        next: z.string().nullable().describe('Full URL of the next page of results, or null when this is the last page.'),
        previous: z.string().nullable().describe('Full URL of the previous page of results, or null when this is the first page.'),
        items: z.array(AverageSchema).describe('Weekly average records for the requested page.')
    })
    .describe('A page of weekly average values, one record per attribute per week.');

/**
 * @tags: [read]
 * @tagReason: Reads weekly average values from the provider without creating, updating, or deleting any data.
 * @pitfalls: By default only the most recent week of averages is returned for each attribute; set include_historical to true to retrieve older weekly averages.
 */
const action = createAction({
    description: 'List weekly average values per attribute, optionally filtered by date range, group, or attribute.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.exist.io/reference/averages/
            endpoint: '/api/2/averages/',
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.date_min !== undefined && { date_min: input.date_min }),
                ...(input.date_max !== undefined && { date_max: input.date_max }),
                ...(input.groups !== undefined && { groups: input.groups.join(',') }),
                ...(input.attributes !== undefined && { attributes: input.attributes.join(',') }),
                ...(input.include_historical !== undefined && { include_historical: input.include_historical ? 1 : 0 })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                count: z.number(),
                next: z.string().nullable(),
                previous: z.string().nullable(),
                results: z.array(AverageSchema)
            })
            .parse(response.data);

        return {
            count: providerResponse.count,
            next: providerResponse.next,
            previous: providerResponse.previous,
            items: providerResponse.results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
