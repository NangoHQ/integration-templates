import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        query: z.string().optional().describe('Search query string to filter tags by label.'),
        limit: z.number().optional().describe('Maximum number of tags to return per page. Defaults to a provider-specific value if omitted.'),
        offset: z.number().optional().describe('Pagination offset for the current page. Starts at 0.'),
        total: z.boolean().optional().describe('Whether to include the total count of matching tags in the response. Defaults to false.')
    })
    .describe('Input parameters for listing PagerDuty tags.');

const ProviderTagSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullish(),
    self: z.string().nullish(),
    html_url: z.string().nullish(),
    label: z.string().nullish()
});

const TagSchema = z.object({
    id: z.string().describe('Unique identifier for the tag.'),
    type: z.string().describe('Type of the resource. Always "tag" for tags.'),
    summary: z.string().optional().describe('Short summary or label of the tag.'),
    self: z.string().optional().describe('API URL for the tag resource.'),
    html_url: z.string().optional().describe('PagerDuty web UI URL for the tag.'),
    label: z.string().optional().describe('Display label of the tag.')
});

const OutputSchema = z
    .object({
        tags: z.array(TagSchema).describe('Array of tags on the account.'),
        limit: z.number().describe('Maximum number of tags requested per page.'),
        offset: z.number().describe('Pagination offset of the current page.'),
        total: z.number().nullable().describe('Total number of matching tags, or null if total was not requested.'),
        more: z.boolean().describe('Whether additional pages of results are available.')
    })
    .describe('Response containing a paginated list of PagerDuty tags.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of tags from the PagerDuty account.
 * @pitfalls: The total field may be populated even when total is not explicitly requested, unlike other PagerDuty list endpoints where it defaults to null unless total=true is passed.
 */
const action = createAction({
    description: 'List tags on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1tags/get
            endpoint: '/tags',
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: String(input.offset) }),
                ...(input.total !== undefined && { total: String(input.total) })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'PagerDuty returned an empty response for the tags list.'
            });
        }

        const ProviderResponseSchema = z.object({
            tags: z.array(z.unknown()),
            limit: z.number(),
            offset: z.number(),
            total: z.number().nullable(),
            more: z.boolean()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const tags = providerResponse.tags.map((item: unknown) => {
            const parsed = ProviderTagSchema.parse(item);
            return {
                id: parsed.id,
                type: parsed.type,
                ...(parsed.summary != null && { summary: parsed.summary }),
                ...(parsed.self != null && { self: parsed.self }),
                ...(parsed.html_url != null && { html_url: parsed.html_url }),
                ...(parsed.label != null && { label: parsed.label })
            };
        });

        return {
            tags,
            limit: providerResponse.limit,
            offset: providerResponse.offset,
            total: providerResponse.total,
            more: providerResponse.more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
