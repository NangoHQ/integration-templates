/**
 * Instructions: Searches for messages matching a query - REQUIRES USER TOKEN (use slack-user-token skill)
 *
 * API Docs: https://api.slack.com/methods/search.messages
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { NangoAction, ProxyConfiguration } from 'nango';

// Input schema
const SearchMessagesInput = z.object({
    query: z.string()
        .describe('The search query. Example: "important meeting"'),
    count: z.number().optional()
        .describe('Number of results per page. Default: 20'),
    page: z.number().optional()
        .describe('Page number of results. Default: 1'),
    sort: z.enum(['score', 'timestamp']).optional()
        .describe('Sort by relevance or recency. Default: "score"'),
    sort_dir: z.enum(['asc', 'desc']).optional()
        .describe('Sort direction. Default: "desc"')
});

// Response type for message matches from Slack API
interface SlackMessageMatch {
    type: string;
    ts: string;
    text: string;
    channel: {
        id: string;
        name: string;
    };
    user?: string;
    username?: string;
    permalink: string;
}

// Output schema
const SearchMessage = z.object({
    type: z.string()
        .describe('The type of message'),
    ts: z.string()
        .describe('Message timestamp'),
    text: z.string()
        .describe('The message text'),
    channel: z.object({
        id: z.string()
            .describe('The channel ID'),
        name: z.string()
            .describe('The channel name')
    }).describe('Channel information'),
    user: z.union([z.string(), z.null()])
        .describe('The user ID who sent the message'),
    username: z.union([z.string(), z.null()])
        .describe('The username who sent the message'),
    permalink: z.string()
        .describe('Permalink to the message in Slack')
});

const SearchMessagesOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    messages: z.object({
        total: z.number()
            .describe('Total number of matching messages'),
        matches: z.array(SearchMessage)
            .describe('Array of matching message objects'),
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
    description: 'Searches for messages matching a query in Slack workspace (requires user token).',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/search-messages',
        group: 'Search'
    },

    input: SearchMessagesInput,
    output: SearchMessagesOutput,
    scopes: ['search:read'],

    exec: async (nango, input): Promise<z.infer<typeof SearchMessagesOutput>> => {
        const baseConfig: ProxyConfiguration = {
            // https://api.slack.com/methods/search.messages
            endpoint: 'search.messages',
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

        const response = await nango.get(config);

        // Return the full response structure
        return {
            ok: response.data.ok,
            messages: {
                total: response.data.messages.total,
                matches: response.data.messages.matches.map((match: SlackMessageMatch) => ({
                    type: match.type,
                    ts: match.ts,
                    text: match.text,
                    channel: {
                        id: match.channel.id,
                        name: match.channel.name
                    },
                    user: match.user ?? null,
                    username: match.username ?? null,
                    permalink: match.permalink
                })),
                pagination: {
                    total_count: response.data.messages.pagination.total_count,
                    page: response.data.messages.pagination.page,
                    per_page: response.data.messages.pagination.per_page,
                    page_count: response.data.messages.pagination.page_count,
                    first: response.data.messages.pagination.first,
                    last: response.data.messages.pagination.last
                }
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
