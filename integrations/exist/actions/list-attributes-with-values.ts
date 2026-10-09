import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const GroupSchema = z.object({
    name: z.string().describe('Machine-readable group name. Example: "activity"'),
    label: z.string().describe('Human-readable group label. Example: "Activity"'),
    priority: z.number().describe('Sort priority of the group.')
});

const ServiceSchema = z.object({
    name: z.string().describe('Machine-readable service name. Example: "googlefit"'),
    label: z.string().describe('Human-readable service label. Example: "Google Fit"')
});

const AttributeValueSchema = z.object({
    date: z.string().describe('Date the value applies to, in YYYY-MM-DD format. Example: "2022-05-16"'),
    value: z
        .union([z.number(), z.string(), z.null()])
        .describe('Value recorded for the date. Null when no data exists for that date; boolean tags are returned as 1 or 0.')
});

const AttributeWithValuesSchema = z.object({
    name: z.string().describe('Machine-readable attribute name. Example: "steps"'),
    label: z.string().describe('Human-readable attribute label. Example: "Steps"'),
    template: z.string().nullish().describe('Attribute template this attribute is based on, or null for custom attributes.'),
    group: GroupSchema.describe('Group this attribute belongs to.'),
    subgroup: z.string().nullish().describe('Subgroup metadata for this attribute, or null when it has no subgroup.'),
    service: ServiceSchema.nullish().describe('Service currently providing data for this attribute, or null when unowned or manually tracked.'),
    active: z.boolean().describe('Whether the attribute is currently active. Released attributes are inactive.'),
    priority: z.number().describe('Sort priority of the attribute.'),
    manual: z.boolean().describe('Whether the attribute is tracked manually rather than by an integration.'),
    value_type: z.number().describe('Numeric value type code. Example: 0 for Integer, 7 for Boolean.'),
    value_type_description: z.string().describe('Human-readable value type description. Example: "Integer"'),
    values: z.array(AttributeValueSchema).describe('Recent values for this attribute, newest first, covering at most the requested number of days.')
});

const InputSchema = z
    .object({
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Omit for the first page.'),
        limit: z.number().int().positive().optional().describe('Maximum number of attributes to return per page.'),
        days: z.number().int().min(1).max(31).optional().describe('Number of recent days of values to include per attribute, from 1 to 31. Defaults to 1.'),
        date_max: z.string().optional().describe('Newest date to include values for, in YYYY-MM-DD format. Example: "2022-05-16"'),
        groups: z.string().optional().describe('Comma-separated group names to filter by. Example: "activity,workouts"'),
        attributes: z.string().optional().describe('Comma-separated attribute names to filter by. Example: "steps,sleep"'),
        templates: z.string().optional().describe('Comma-separated attribute template names to filter by. Example: "steps,mood"'),
        manual: z.boolean().optional().describe('When true, only return manually tracked attributes.')
    })
    .describe("Filters for listing the user's attributes and their recent values.");

const OutputSchema = z
    .object({
        attributes: z.array(AttributeWithValuesSchema).describe('Attributes matching the filters, each with its recent values.'),
        count: z.number().describe('Total number of attributes matching the filters across all pages.'),
        next: z.string().nullable().describe('Full URL of the next page of results, or null when there are no more pages.'),
        previous: z.string().nullable().describe('Full URL of the previous page of results, or null on the first page.')
    })
    .describe("A page of the user's attributes, each with its recent values.");

const ProviderPageSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(AttributeWithValuesSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads the user's attributes and their recent values from the provider; it performs no provider mutation.
 * @pitfalls: Attributes outside the connection's read scopes are silently omitted, and filtering by an inactive or released attribute returns an empty result rather than an error; individual value entries can be null for dates with no data, and the groups/attributes/templates filters must be comma-separated strings.
 */
const action = createAction({
    description: "List the user's attributes together with their recent values (up to the last 31 days) in one call.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.page !== undefined) {
            params['page'] = input.page;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.days !== undefined) {
            params['days'] = input.days;
        }

        if (input.date_max !== undefined) {
            params['date_max'] = input.date_max;
        }

        if (input.groups !== undefined) {
            params['groups'] = input.groups;
        }

        if (input.attributes !== undefined) {
            params['attributes'] = input.attributes;
        }

        if (input.templates !== undefined) {
            params['templates'] = input.templates;
        }

        if (input.manual !== undefined) {
            params['manual'] = String(input.manual);
        }

        const config: ProxyConfiguration = {
            // https://developer.exist.io/reference/attributes/#get-attributes-with-values
            endpoint: '/api/2/attributes/with-values/',
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const page = ProviderPageSchema.parse(response.data);

        return {
            attributes: page.results,
            count: page.count,
            next: page.next,
            previous: page.previous
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
