import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    url: z.string().describe('The URL to receive the webhook payload. Example: "https://example.com/webhook"'),
    events: z.array(z.string()).describe('Array of event keys. Example: ["repo:push", "pullrequest:created"]'),
    description: z.string().optional().describe('Optional description for the webhook.'),
    active: z.boolean().optional().describe('Whether the webhook is active. Defaults to true.'),
    secret: z.string().optional().describe('Optional secret for payload signing.')
});

const ProviderWebhookSchema = z.object({
    uuid: z.string(),
    url: z.string(),
    active: z.boolean(),
    description: z.string().optional(),
    events: z.array(z.string()),
    created_at: z.string().optional(),
    subject: z
        .object({
            type: z.string().optional(),
            full_name: z.string().optional(),
            links: z.record(z.string(), z.unknown()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    uuid: z.string(),
    url: z.string(),
    active: z.boolean(),
    description: z.string().optional(),
    events: z.array(z.string()),
    created_at: z.string().optional()
});

const action = createAction({
    description: 'Create a webhook on a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook', 'repository:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            url: input.url,
            events: input.events
        };

        if (input.description !== undefined) {
            body['description'] = input.description;
        }

        if (input.active !== undefined) {
            body['active'] = input.active;
        }

        if (input.secret !== undefined) {
            body['secret'] = input.secret;
        }

        const response = await nango.post({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-repo-slug-hooks-post
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/hooks`,
            data: body,
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            uuid: providerWebhook.uuid,
            url: providerWebhook.url,
            active: providerWebhook.active,
            ...(providerWebhook.description !== undefined && { description: providerWebhook.description }),
            events: providerWebhook.events,
            ...(providerWebhook.created_at !== undefined && { created_at: providerWebhook.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
