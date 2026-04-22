import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issue_id: z.string().describe('The unique identifier of the issue to archive. Example: "abc123-def456"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    issue: z
        .union([
            z.object({
                id: z.string()
            }),
            z.null()
        ])
        .describe('The archived issue entity. Null if the issue was deleted.'),
    last_sync_id: z.union([z.string(), z.number(), z.null()]).describe('The identifier of the last sync operation.')
});

const action = createAction({
    description: 'Archive a Linear issue so it is removed from active workflows.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/archive-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation ArchiveIssue($id: String!) {
                        issueArchive(id: $id) {
                            success
                            entity {
                                id
                            }
                            lastSyncId
                        }
                    }
                `,
                variables: {
                    id: input.issue_id
                }
            },
            retries: 1
        });

        if (!response.data || !response.data.data || !response.data.data.issueArchive) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response from Linear API'
            });
        }

        const result = response.data.data.issueArchive;

        return {
            success: result.success,
            issue: result.entity || null,
            last_sync_id: result.lastSyncId || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
