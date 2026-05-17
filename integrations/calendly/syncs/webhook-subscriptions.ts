import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WebhookSubscriptionOutputSchema = z.object({
    id: z.string().describe('Unique identifier (extracted from URI)'),
    uri: z.string().describe('Full URI of the webhook subscription'),
    callback_url: z.string().describe('URL that receives webhook events'),
    events: z.array(z.string()).describe('Array of event types subscribed to'),
    scope: z.enum(['organization', 'user', 'group']).describe('Scope of the webhook subscription'),
    organization: z.string().describe('URI of the organization'),
    user: z.string().optional().describe('URI of the user (when scope is user)'),
    group: z.string().optional().describe('URI of the group (when scope is group)'),
    created_at: z.string().describe('When the subscription was created'),
    updated_at: z.string().describe('When the subscription was last updated'),
    retry_started_at: z.string().optional().describe('When retries started for failed deliveries'),
    status: z.enum(['active', 'disabled']).optional().describe('Current status of the webhook'),
    state: z.string().optional().describe('Additional state information')
});

const CheckpointSchema = z.object({
    page_token: z.string().describe('Pagination token for resuming the current full refresh')
});

interface WebhookSubscriptionResponse {
    uri: string;
    callback_url: string;
    events: string[];
    scope: 'organization' | 'user' | 'group';
    organization: string;
    user?: string;
    group?: string;
    created_at: string;
    updated_at: string;
    retry_started_at?: string | null;
    status?: 'active' | 'disabled';
    state?: string;
}

interface UserResponse {
    resource: {
        uri: string;
        current_organization: string;
    };
}

const sync = createSync({
    description: 'Sync webhook subscriptions from Calendly',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            // https://developer.calendly.com/api-docs/faac832d7c57d-list-webhook-subscriptions
            method: 'GET',
            path: '/webhook-subscriptions'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        WebhookSubscription: WebhookSubscriptionOutputSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let pageToken = typeof rawCheckpoint?.page_token === 'string' ? rawCheckpoint.page_token : '';

        // Blocker: The Calendly webhook subscriptions API does not support
        // filtering by updated_at or any modified-since parameter.
        // The endpoint only supports page_token resume, so we use that to resume
        // a full refresh alongside trackDeletes-based deletion detection.
        await nango.trackDeletesStart('WebhookSubscription');

        // https://developer.calendly.com/api-docs/d5e4cd35f1f44-get-current-user
        const userResponse = await nango.get<UserResponse>({
            endpoint: '/users/me',
            retries: 3
        });

        const organizationUri = userResponse.data.resource.current_organization;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.calendly.com/api-docs/faac832d7c57d-list-webhook-subscriptions
            endpoint: '/webhook_subscriptions',
            params: {
                scope: 'organization',
                organization: organizationUri,
                sort: 'created_at:asc',
                count: 100,
                ...(pageToken && { page_token: pageToken })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_token',
                cursor_path_in_response: 'pagination.next_page_token',
                response_path: 'collection',
                limit_name_in_request: 'count',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    pageToken = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<WebhookSubscriptionResponse>(proxyConfig)) {
            const subscriptions = page.map((record) => {
                // Extract UUID from URI (format: https://api.calendly.com/webhook_subscriptions/{uuid})
                const id = record.uri.split('/').pop() || record.uri;

                return {
                    id,
                    uri: record.uri,
                    callback_url: record.callback_url,
                    events: record.events,
                    scope: record.scope,
                    organization: record.organization,
                    ...(record.user && { user: record.user }),
                    ...(record.group && { group: record.group }),
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    ...(record.retry_started_at && { retry_started_at: record.retry_started_at }),
                    ...(record.status && { status: record.status }),
                    ...(record.state && { state: record.state })
                };
            });

            if (subscriptions.length > 0) {
                await nango.batchSave(subscriptions, 'WebhookSubscription');
            }

            if (pageToken) {
                await nango.saveCheckpoint({ page_token: pageToken });
            }
        }

        // Only call trackDeletesEnd after successfully fetching all pages
        await nango.trackDeletesEnd('WebhookSubscription');
        await nango.saveCheckpoint({ page_token: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
