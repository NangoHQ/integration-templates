import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    page: z.number().optional().describe('Page number for pagination.'),
    pagelen: z.number().optional().describe('Number of items per page.')
});

const WebhookSchema = z.object({
    uuid: z.string().describe('Webhook UUID.'),
    url: z.string().describe('Target URL for the webhook.'),
    description: z.string().optional().describe('Description of the webhook.'),
    active: z.boolean().describe('Whether the webhook is active.'),
    created_at: z.string().optional().describe('Creation timestamp.'),
    events: z.array(z.string()).optional().describe('Events that trigger the webhook.')
});

const OutputSchema = z.object({
    values: z.array(WebhookSchema).describe('List of webhooks.'),
    page: z.number().optional().describe('Current page number.'),
    pagelen: z.number().optional().describe('Number of items per page.'),
    size: z.number().optional().describe('Total number of webhooks.'),
    next: z.string().optional().describe('URL for the next page of results.')
});

const RawWebhookSchema = z
    .object({
        uuid: z.string().optional(),
        url: z.string().optional(),
        description: z.string().optional(),
        active: z.boolean().optional(),
        created_at: z.string().optional(),
        events: z.array(z.string()).optional()
    })
    .passthrough();

const RawListResponseSchema = z.object({
    values: z.array(z.unknown()).optional(),
    page: z.number().optional(),
    pagelen: z.number().optional(),
    size: z.number().optional(),
    next: z.string().optional()
});

const action = createAction({
    description: 'List webhooks on a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-repo-slug-hooks-get
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/hooks`,
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.pagelen !== undefined && { pagelen: String(input.pagelen) })
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Bitbucket API.'
            });
        }

        const parsed = RawListResponseSchema.parse(raw);
        const values = (parsed.values || []).map((item) => {
            const webhook = RawWebhookSchema.safeParse(item);
            if (!webhook.success) {
                return null;
            }
            return {
                uuid: webhook.data.uuid || '',
                url: webhook.data.url || '',
                ...(webhook.data.description !== undefined && { description: webhook.data.description }),
                active: webhook.data.active || false,
                ...(webhook.data.created_at !== undefined && { created_at: webhook.data.created_at }),
                ...(webhook.data.events !== undefined && { events: webhook.data.events })
            };
        });
        const filtered = values.filter((item): item is NonNullable<typeof item> => item !== null);

        return {
            values: filtered,
            ...(parsed.page !== undefined && { page: parsed.page }),
            ...(parsed.pagelen !== undefined && { pagelen: parsed.pagelen }),
            ...(parsed.size !== undefined && { size: parsed.size }),
            ...(parsed.next !== undefined && { next: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
