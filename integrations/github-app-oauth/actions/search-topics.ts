import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        q: z.string().min(1).describe('Search keywords and qualifiers, for example "javascript" or "ruby is:featured".'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (1-100). GitHub defaults to 30.'),
        page: z.number().int().min(1).optional().describe('Page number to fetch, starting at 1. GitHub defaults to 1.')
    })
    .describe('Parameters for searching GitHub topics.');

const TopicRelationSchema = z.object({
    id: z.number().describe('Numeric identifier of the topic relation.'),
    name: z.string().describe('Name of the related or aliased topic.'),
    topic_id: z.number().describe('Numeric identifier of the related or aliased topic.'),
    relation_type: z.string().describe('Type of relationship, such as related or alias.')
});

const TopicSchema = z.object({
    name: z.string().describe('Canonical topic name, for example "javascript".'),
    display_name: z.string().nullable().describe('Display name of the topic, or null when it has none.'),
    short_description: z.string().nullable().describe('Short description shown on topic pages, or null when absent.'),
    description: z.string().nullable().describe('Longer topic description, or null when absent.'),
    created_by: z.string().nullable().describe('User or organization that created the topic, or null when unknown.'),
    released: z.string().nullable().describe('Release information for the topic, or null when unspecified.'),
    created_at: z.string().describe('ISO 8601 timestamp when the topic was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the topic was last updated.'),
    featured: z.boolean().describe('Whether GitHub features the topic on the topics page.'),
    curated: z.boolean().describe('Whether the topic is curated by GitHub.'),
    score: z.number().describe('Search relevance score for the topic.'),
    repository_count: z.number().nullable().optional().describe('Number of repositories using the topic, or null when unavailable.'),
    logo_url: z.string().nullable().optional().describe('URL of the topic logo, or null when there is none.'),
    related: z.array(TopicRelationSchema).nullable().optional().describe('Related topics, or null when none are returned.'),
    aliases: z.array(TopicRelationSchema).nullable().optional().describe('Alternative topic names, or null when none are returned.')
});

const OutputSchema = z
    .object({
        total_count: z.number().describe('Total number of topics matching the query.'),
        incomplete_results: z.boolean().describe('Whether the search timed out before finding all matches.'),
        items: z.array(TopicSchema).describe('Topics matching the query, ordered by best match.')
    })
    .describe('Topics matching the search query along with match metadata.');

/**
 * @tags: [read]
 * @tagReason: Searches public GitHub topic metadata without modifying any provider resource.
 * @pitfalls: Search has its own rate limit (30 authenticated requests per minute), returns at most 1,000 results across all pages, and rejects queries longer than 256 characters; incomplete_results can be true when a query times out.
 */
const action = createAction({
    description: 'Search GitHub topics (the tagging/categorization objects behind repository topic pages).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/search/search#search-topics
            endpoint: '/search/topics',
            params: {
                q: input.q,
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.page !== undefined && { page: input.page })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
