import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    webhook_uuid: z.string().describe('Webhook UUID. Example: "{216a4943-db76-4086-9dcc-9a0b525062f5}"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    workspace: z.string(),
    repo_slug: z.string(),
    webhook_uuid: z.string()
});

const action = createAction({
    description: 'Delete a repository webhook',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-repo-slug-hooks-uid-delete
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/hooks/${encodeURIComponent(input.webhook_uuid)}`,
            retries: 3
        });

        return {
            success: true,
            workspace: input.workspace,
            repo_slug: input.repo_slug,
            webhook_uuid: input.webhook_uuid
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
