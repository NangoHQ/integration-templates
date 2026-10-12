import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        page: z.number().int().positive().optional().describe('Page index to retrieve, starting at 1. Defaults to 1.'),
        limit: z.number().int().min(1).max(100).optional().describe('Number of insights per page, between 1 and 100. Defaults to the provider default.'),
        date_min: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Oldest target date to include, in YYYY-MM-DD format.'),
        date_max: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Most recent target date to include, in YYYY-MM-DD format.'),
        priority: z.number().int().min(1).max(4).optional().describe('Only return insights with this priority: 1=today, 2=day, 3=week, 4=month.')
    })
    .describe('Filters for listing the personalized insights Exist has generated for the user.');

const AttributeGroupSchema = z.object({
    name: z.string(),
    label: z.string(),
    priority: z.number().int()
});

const InsightAttributeSchema = z.object({
    name: z.string(),
    label: z.string(),
    group: AttributeGroupSchema,
    priority: z.number().int(),
    value_type: z.number().int(),
    value_type_description: z.string()
});

const InsightTypeSchema = z.object({
    name: z.string(),
    period: z.number().int(),
    priority: z.number().int(),
    attribute: InsightAttributeSchema.nullable().optional()
});

const ProviderInsightSchema = z.object({
    created: z.string(),
    target_date: z.string().nullable().optional(),
    type: InsightTypeSchema,
    html: z.string(),
    text: z.string()
});

const ProviderInsightsResponseSchema = z.object({
    count: z.number().int(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(ProviderInsightSchema)
});

const OutputAttributeGroupSchema = z.object({
    name: z.string().describe('Identifier of the attribute group.'),
    label: z.string().describe('Human-readable label of the attribute group.'),
    priority: z.number().int().describe('Sort priority of the attribute group.')
});

const OutputInsightAttributeSchema = z.object({
    name: z.string().describe('Identifier of the attribute the insight relates to.'),
    label: z.string().describe('Human-readable label of the attribute.'),
    group: OutputAttributeGroupSchema.describe('Group the attribute belongs to.'),
    priority: z.number().int().describe('Sort priority of the attribute.'),
    value_type: z.number().int().describe('Numeric value type code of the attribute.'),
    value_type_description: z.string().describe('Human-readable description of the attribute value type.')
});

const OutputInsightTypeSchema = z.object({
    name: z.string().describe('Identifier of the insight type.'),
    period: z.number().int().describe('Number of days the insight type covers.'),
    priority: z.number().int().describe('Priority of the insight type: 1=today, 2=day, 3=week, 4=month.'),
    attribute: OutputInsightAttributeSchema.optional().describe('Attribute the insight relates to, when the insight targets a specific attribute.')
});

const InsightSchema = z.object({
    created: z.string().describe('ISO 8601 timestamp when the insight was generated.'),
    target_date: z.string().optional().describe('Date the insight relates to in YYYY-MM-DD format, when tied to a specific day.'),
    type: OutputInsightTypeSchema.describe('Type of the generated insight.'),
    html: z.string().describe('HTML-rendered insight content.'),
    text: z.string().describe('Plain-text insight content.')
});

const OutputSchema = z
    .object({
        count: z.number().int().describe('Total number of insights matching the filters across all pages.'),
        next_page: z.number().int().nullable().describe('Page number to request for the next page, or null when on the last page.'),
        previous_page: z.number().int().nullable().describe('Page number to request for the previous page, or null when on the first page.'),
        results: z.array(InsightSchema).describe('Insights returned on the requested page.')
    })
    .describe('A page of personalized Exist insights with pagination information.');

function pageFromUrl(url: string | null): number | null {
    if (url == null) {
        return null;
    }
    const page = new URL(url).searchParams.get('page');
    if (page == null) {
        return null;
    }
    const parsed = Number(page);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * @tags: [read]
 * @tagReason: Reads the user's generated insights without modifying any provider data.
 * @pitfalls: Only insights permitted by the connection's granted read scopes are returned, and the provider limits this connection to 300 requests per hour, so paging through many results can exhaust the quota.
 */
const action = createAction({
    description: 'List personalized insights Exist has generated for the user, optionally filtered by date range and priority.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.exist.io/reference/insights/
            endpoint: '/api/2/insights/',
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.date_min !== undefined && { date_min: input.date_min }),
                ...(input.date_max !== undefined && { date_max: input.date_max }),
                ...(input.priority !== undefined && { priority: input.priority })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderInsightsResponseSchema.parse(response.data);

        return {
            count: parsed.count,
            next_page: pageFromUrl(parsed.next),
            previous_page: pageFromUrl(parsed.previous),
            results: parsed.results.map((insight) => ({
                created: insight.created,
                ...(insight.target_date != null && { target_date: insight.target_date }),
                type: {
                    name: insight.type.name,
                    period: insight.type.period,
                    priority: insight.type.priority,
                    ...(insight.type.attribute != null && {
                        attribute: {
                            name: insight.type.attribute.name,
                            label: insight.type.attribute.label,
                            group: {
                                name: insight.type.attribute.group.name,
                                label: insight.type.attribute.group.label,
                                priority: insight.type.attribute.group.priority
                            },
                            priority: insight.type.attribute.priority,
                            value_type: insight.type.attribute.value_type,
                            value_type_description: insight.type.attribute.value_type_description
                        }
                    })
                },
                html: insight.html,
                text: insight.text
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
