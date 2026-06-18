import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    webhook_uuid: z.string().describe('Webhook UUID. Example: "{216a4943-db76-4086-9dcc-9a0b525062f5}"'),
    description: z.string().optional().nullable().describe('Webhook description.'),
    url: z.string().optional().nullable().describe('Webhook URL.'),
    secret: z.string().optional().nullable().describe('Webhook secret. Pass null to remove.'),
    active: z.boolean().optional().nullable().describe('Whether the webhook is active.'),
    events: z.array(z.string()).optional().nullable().describe('List of event types.')
});

const ProviderWebhookSchema = z.object({
    type: z.string().optional(),
    uuid: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional().nullable(),
    subject_type: z.string().optional(),
    active: z.boolean().optional(),
    created_at: z.string().optional(),
    events: z.array(z.string()).optional(),
    secret_set: z.boolean().optional(),
    secret: z.string().optional().nullable()
});

const OutputSchema = z.object({
    type: z.string().optional(),
    uuid: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional(),
    subject_type: z.string().optional(),
    active: z.boolean().optional(),
    created_at: z.string().optional(),
    events: z.array(z.string()).optional(),
    secret_set: z.boolean().optional()
});

const action = createAction({
    description: 'Update a repository webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.url !== undefined) {
            body['url'] = input.url;
        }
        if (input.secret !== undefined) {
            body['secret'] = input.secret;
        }
        if (input.active !== undefined) {
            body['active'] = input.active;
        }
        if (input.events !== undefined) {
            body['events'] = input.events;
        }

        const response = await nango.put({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-repo-slug-hooks-uid-put
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/hooks/${encodeURIComponent(input.webhook_uuid)}`,
            data: body,
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            ...(providerWebhook.type !== undefined && { type: providerWebhook.type }),
            ...(providerWebhook.uuid !== undefined && { uuid: providerWebhook.uuid }),
            ...(providerWebhook.url !== undefined && { url: providerWebhook.url }),
            ...(providerWebhook.description !== undefined && providerWebhook.description !== null && { description: providerWebhook.description }),
            ...(providerWebhook.subject_type !== undefined && { subject_type: providerWebhook.subject_type }),
            ...(providerWebhook.active !== undefined && { active: providerWebhook.active }),
            ...(providerWebhook.created_at !== undefined && { created_at: providerWebhook.created_at }),
            ...(providerWebhook.events !== undefined && { events: providerWebhook.events }),
            ...(providerWebhook.secret_set !== undefined && { secret_set: providerWebhook.secret_set })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
