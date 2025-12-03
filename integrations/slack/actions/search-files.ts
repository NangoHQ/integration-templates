/**
 * Instructions: Searches for files matching a query - REQUIRES USER TOKEN (use slack-user-token skill)
 *
 * API Docs: https://api.slack.com/methods/search.files
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { NangoAction, ProxyConfiguration } from 'nango';

// Input schema
const SearchFilesInput = z.object({
    query: z.string()
        .describe('The search query. Example: "project report"'),
    count: z.number().optional()
        .describe('Number of results per page. Default: 20'),
    page: z.number().optional()
        .describe('Page number of results. Default: 1'),
    sort: z.enum(['score', 'timestamp']).optional()
        .describe('Sort by relevance or recency. Default: "score"'),
    sort_dir: z.enum(['asc', 'desc']).optional()
        .describe('Sort direction. Default: "desc"')
});

// Response type for file matches from Slack API
interface SlackFileMatch {
    id: string;
    name: string;
    title: string;
    mimetype: string;
    filetype: string;
    size: number;
    url_private: string;
    permalink: string;
    timestamp: number;
}

// Output schema
const SearchFile = z.object({
    id: z.string()
        .describe('The file ID'),
    name: z.string()
        .describe('The filename'),
    title: z.string()
        .describe('The file title'),
    mimetype: z.string()
        .describe('The MIME type'),
    filetype: z.string()
        .describe('The file type extension'),
    size: z.number()
        .describe('File size in bytes'),
    url_private: z.string()
        .describe('Private URL to access the file'),
    permalink: z.string()
        .describe('Permalink to the file in Slack'),
    timestamp: z.number()
        .describe('Unix timestamp when file was created')
});

const SearchFilesOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    files: z.object({
        total: z.number()
            .describe('Total number of matching files'),
        matches: z.array(SearchFile)
            .describe('Array of matching file objects'),
        pagination: z.object({
            total_count: z.number()
                .describe('Total count of results'),
            page: z.number()
                .describe('Current page number'),
            per_page: z.number()
                .describe('Results per page'),
            page_count: z.number()
                .describe('Total number of pages'),
            first: z.number()
                .describe('First result index'),
            last: z.number()
                .describe('Last result index')
        }).describe('Pagination information')
    }).describe('Search results')
});

/**
 * Adds a Bearer token from connection credentials to the proxy config.
 * Use for Slack endpoints requiring user token instead of bot token.
 *
 * @param nango - The Nango action instance
 * @param tokenPath - Dot-notation path to token in credentials (e.g., "raw.authed_user.access_token")
 * @param proxyConfig - The proxy configuration to augment
 * @returns ProxyConfiguration with authorization header set
 */
async function addBearerTokenToConfig(
    nango: NangoAction,
    tokenPath: string,
    proxyConfig: ProxyConfiguration
): Promise<ProxyConfiguration> {
    const connection = await nango.getConnection();
    const credentials = connection.credentials;

    if (!credentials || typeof credentials !== 'object') {
        throw new nango.ActionError({
            message: `No credentials found for connection.`
        });
    }

    // For Slack OAuth with user scopes, token is at raw.authed_user.access_token
    // Navigate through the credentials object safely
    const credObj = credentials;
    if (!('raw' in credObj) || typeof credObj.raw !== 'object' || credObj.raw === null) {
        throw new nango.ActionError({
            message: `User token not found at path '${tokenPath}'. Ensure the Slack OAuth includes user scopes.`
        });
    }
    const rawObj = credObj.raw;
    if (!('authed_user' in rawObj) || typeof rawObj.authed_user !== 'object' || rawObj.authed_user === null) {
        throw new nango.ActionError({
            message: `User token not found at path '${tokenPath}'. Ensure the Slack OAuth includes user scopes.`
        });
    }
    const authedUser = rawObj.authed_user;
    if (!('access_token' in authedUser) || typeof authedUser.access_token !== 'string') {
        throw new nango.ActionError({
            message: `User token not found at path '${tokenPath}'. Ensure the Slack OAuth includes user scopes.`
        });
    }
    const token = authedUser.access_token;

    return {
        ...proxyConfig,
        retries: proxyConfig.retries ?? 3,
        headers: {
            ...proxyConfig.headers,
            Authorization: `Bearer ${token}`  // Overrides Nango's automatic bot token
        }
    };
}

const action = createAction({
    description: 'Searches for files matching a query in Slack workspace (requires user token).',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/search-files',
        group: 'Search'
    },

    input: SearchFilesInput,
    output: SearchFilesOutput,
    scopes: ['search:read'],

    exec: async (nango, input): Promise<z.infer<typeof SearchFilesOutput>> => {
        const baseConfig: ProxyConfiguration = {
            // https://api.slack.com/methods/search.files
            endpoint: 'search.files',
            params: {
                query: input.query,
                ...(input.count && { count: input.count.toString() }),
                ...(input.page && { page: input.page.toString() }),
                ...(input.sort && { sort: input.sort }),
                ...(input.sort_dir && { sort_dir: input.sort_dir })
            },
            retries: 3
        };

        // Add user token authentication
        const config = await addBearerTokenToConfig(
            nango,
            'raw.authed_user.access_token',
            baseConfig
        );

        // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
        const response = await nango.get(config);

        // Return the full response structure
        return {
            ok: response.data.ok,
            files: {
                total: response.data.files.total,
                matches: response.data.files.matches.map((match: SlackFileMatch) => ({
                    id: match.id,
                    name: match.name,
                    title: match.title,
                    mimetype: match.mimetype,
                    filetype: match.filetype,
                    size: match.size,
                    url_private: match.url_private,
                    permalink: match.permalink,
                    timestamp: match.timestamp
                })),
                pagination: {
                    total_count: response.data.files.pagination.total_count,
                    page: response.data.files.pagination.page,
                    per_page: response.data.files.pagination.per_page,
                    page_count: response.data.files.pagination.page_count,
                    first: response.data.files.pagination.first,
                    last: response.data.files.pagination.last
                }
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
