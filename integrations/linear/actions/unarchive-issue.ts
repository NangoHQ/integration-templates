import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('The ID of the archived issue to restore. Example: "issue-123"')
});

const OutputSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    state: z.object({
        id: z.string(),
        name: z.string()
    }),
    url: z.string()
});

const action = createAction({
    description: 'Restore an archived Linear issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unarchive-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueUnarchive($id: String!) {
                        issueUnarchive(id: $id) {
                            success
                            entity {
                                id
                                identifier
                                title
                                state {
                                    id
                                    name
                                }
                                url
                            }
                        }
                    }
                `,
                variables: {
                    id: input.issueId
                }
            },
            retries: 3
        });

        const data = response.data?.data?.issueUnarchive;

        if (!data?.success || !data?.entity) {
            throw new nango.ActionError({
                type: 'unarchive_failed',
                message: 'Failed to unarchive issue. The issue may not exist or may not be archived.',
                issueId: input.issueId
            });
        }

        const issue = data.entity;

        return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            state: {
                id: issue.state.id,
                name: issue.state.name
            },
            url: issue.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
