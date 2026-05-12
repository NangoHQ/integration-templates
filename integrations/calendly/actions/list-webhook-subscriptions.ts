import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_url: z.string().optional().describe('Filter by organization URL. Example: "https://api.calendly.com/organizations/ABC123"'),
    user_url: z.string().optional().describe('Filter by user URL. Example: "https://api.calendly.com/users/ABC123"'),
    scope: z.enum(['organization', 'user']).optional().describe('Scope of webhook subscriptions to return. Required when filtering by organization or user'),
    sort: z.enum(['created_at:asc', 'created_at:desc']).optional().describe('Sort order for results. Default: created_at:desc'),
    count: z.number().int().min(1).max(100).optional().describe('Number of results per page. Max: 100, Default: 20'),
    page_token: z.string().optional().describe('Pagination token from a previous response')
});

const PaginationSchema = z.object({
    count: z.number().int().optional(),
    next_page_token: z.string().nullable().optional(),
    previous_page_token: z.string().nullable().optional()
});

const ProviderWebhookSubscriptionSchema = z.object({
    uri: z.string(),
    callback_url: z.string(),
    events: z.array(z.string()),
    organization: z.string(),
    user: z.string().nullable().optional(),
    scope: z.enum(['organization', 'user']),
    created_at: z.string(),
    updated_at: z.string(),
    creator: z.string(),
    retry_started_at: z.string().nullable().optional(),
    state: z.string(),
    version: z.string()
});

const ProviderResponseSchema = z.object({
    collection: z.array(ProviderWebhookSubscriptionSchema),
    pagination: PaginationSchema.optional()
});

const WebhookSubscriptionSchema = z.object({
    uri: z.string().describe('Canonical reference for the webhook subscription'),
    callback_url: z.string().describe('URL where webhook events are sent'),
    events: z.array(z.string()).describe('List of event types subscribed to'),
    organization: z.string().describe('URL of the associated organization'),
    user: z.string().optional().describe('URL of the associated user, if scoped to user'),
    scope: z.enum(['organization', 'user']).describe('Scope of the webhook subscription'),
    created_at: z.string().describe('ISO 8601 timestamp when the subscription was created'),
    updated_at: z.string().describe('ISO 8601 timestamp when the subscription was last updated'),
    creator: z.string().describe('URL of the user who created the subscription'),
    retry_started_at: z.string().optional().describe('When retry attempts started, if applicable'),
    state: z.string().describe('Current state of the webhook subscription'),
    version: z.string().describe('Version of the webhook subscription')
});

const OutputSchema = z.object({
    collection: z.array(WebhookSubscriptionSchema).describe('List of webhook subscriptions'),
    pagination: PaginationSchema.optional()
});

const action = createAction({
    description: 'List webhook subscriptions from Calendly',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-webhook-subscriptions',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((input.organization_url !== undefined || input.user_url !== undefined) && input.scope === undefined) {
            throw new nango.ActionError({
                type: 'missing_scope',
                message: '`scope` is required when `organization_url` or `user_url` is provided'
            });
        }

        const params: Record<string, string | number> = {};

        if (input.organization_url !== undefined) {
            params['organization'] = input.organization_url;
        }
        if (input.user_url !== undefined) {
            params['user'] = input.user_url;
        }
        if (input.scope !== undefined) {
            params['scope'] = input.scope;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }
        if (input.count !== undefined) {
            params['count'] = input.count;
        }
        if (input.page_token !== undefined) {
            params['page_token'] = input.page_token;
        }

        // https://developer.calendly.com/api-docs/faac832d7c57d-list-webhook-subscriptions
        const response = await nango.get({
            endpoint: '/webhook_subscriptions',
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from Calendly API'
            });
        }

        const rawData = ProviderResponseSchema.parse(response.data);

        const collection: z.infer<typeof WebhookSubscriptionSchema>[] = [];
        for (const item of rawData.collection) {
            const mappedItem: z.infer<typeof WebhookSubscriptionSchema> = {
                uri: item.uri,
                callback_url: item.callback_url,
                events: item.events,
                organization: item.organization,
                scope: item.scope,
                created_at: item.created_at,
                updated_at: item.updated_at,
                creator: item.creator,
                state: item.state,
                version: item.version
            };

            if (item.user !== undefined && item.user !== null) {
                mappedItem.user = item.user;
            }
            if (item.retry_started_at !== undefined && item.retry_started_at !== null) {
                mappedItem.retry_started_at = item.retry_started_at;
            }

            collection.push(mappedItem);
        }

        const result: z.infer<typeof OutputSchema> = {
            collection
        };

        if (rawData.pagination !== undefined) {
            result.pagination = {};
            if (rawData.pagination.count !== undefined) {
                result.pagination.count = rawData.pagination.count;
            }
            if (rawData.pagination.next_page_token !== undefined) {
                result.pagination.next_page_token = rawData.pagination.next_page_token;
            }
            if (rawData.pagination.previous_page_token !== undefined) {
                result.pagination.previous_page_token = rawData.pagination.previous_page_token;
            }
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
