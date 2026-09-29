import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        per_page: z.number().optional().describe('Number of results per page (max 100).'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
    })
    .describe('Input for listing repository labels.');

const ProviderLabelSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    color: z.string(),
    default: z.boolean()
});

const OutputLabelSchema = z.object({
    id: z.number().describe('Label ID.'),
    node_id: z.string().describe('Node ID.'),
    url: z.string().describe('API URL for the label.'),
    name: z.string().describe('Label name.'),
    description: z.string().optional().describe('Label description.'),
    color: z.string().describe('Hex color code without the leading #.'),
    default: z.boolean().describe('Whether this is a default label.')
});

const OutputSchema = z
    .object({
        labels: z.array(OutputLabelSchema).describe('Array of repository labels.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page, if more results exist.')
    })
    .describe('Output for listing repository labels.');

/**
 * @tags: [read]
 * @tagReason: Reads repository labels from the GitHub API.
 */
const action = createAction({
    description: 'List repository labels with pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string'
            });
        }

        const config: Omit<ProxyConfiguration, 'method'> = {
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels`,
            params: {
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        };

        // https://docs.github.com/en/rest/issues/labels#list-labels-for-a-repository
        const response = await nango.get(config);

        const providerLabels = z.array(ProviderLabelSchema).parse(response.data);

        const labels = providerLabels.map((label) => ({
            id: label.id,
            node_id: label.node_id,
            url: label.url,
            name: label.name,
            ...(label.description != null && { description: label.description }),
            color: label.color,
            default: label.default
        }));

        let next_cursor: string | undefined;
        const linkHeader = response.headers?.['link'] ?? response.headers?.['Link'];
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch) {
                const nextUrlStr = nextMatch[1];
                if (nextUrlStr) {
                    const nextUrl = new URL(nextUrlStr);
                    const nextPage = nextUrl.searchParams.get('page');
                    if (nextPage) {
                        next_cursor = nextPage;
                    }
                }
            }
        }

        return {
            labels,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
