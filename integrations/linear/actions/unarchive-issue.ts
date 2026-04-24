import { createAction } from 'nango';
import * as z from 'zod';

const inputSchema = z.object({
    id: z.string().min(1)
});

const outputSchema = z.object({
    success: z.boolean(),
    issueId: z.string().nullable(),
    identifier: z.string().nullable(),
    title: z.string().nullable(),
    archivedAt: z.string().nullable()
});

const graphQLResponseSchema = z.object({
    data: z.object({
        issueUnarchive: z.object({
            success: z.boolean(),
            lastSyncId: z.number(),
            entity: z
                .object({
                    id: z.string(),
                    identifier: z.string(),
                    title: z.string(),
                    archivedAt: z.string().nullable()
                })
                .nullable()
        })
    })
});

const action = createAction({
    description: 'Restore an archived Linear issue.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/unarchive-issue', group: 'Issues' },
    input: inputSchema,
    output: outputSchema,

    exec: async (nango, input) => {
        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            retries: 3,
            data: {
                query: `
                    mutation IssueUnarchive($id: String!) {
                        issueUnarchive(id: $id) {
                            success
                            lastSyncId
                            entity {
                                id
                                identifier
                                title
                                archivedAt
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            }
        });

        const parsed = graphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid GraphQL response: ${parsed.error.message}`);
        }

        const payload = parsed.data.data.issueUnarchive;

        return {
            success: payload.success,
            issueId: payload.entity?.id ?? null,
            identifier: payload.entity?.identifier ?? null,
            title: payload.entity?.title ?? null,
            archivedAt: payload.entity?.archivedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
