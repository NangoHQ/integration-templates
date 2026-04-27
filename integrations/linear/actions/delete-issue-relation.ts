import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the issue relation to delete. Example: "abc123-def456"')
});

const ProviderDeletePayloadSchema = z.object({
    success: z.boolean(),
    entityId: z.string().optional(),
    lastSyncId: z.number().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    entityId: z.string().optional(),
    lastSyncId: z.number().optional()
});

const action = createAction({
    description: 'Delete a relationship between two Linear issues.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-issue-relation',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueRelationDelete($id: String!) {
                        issueRelationDelete(id: $id) {
                            success
                            entityId
                            lastSyncId
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 10
        });

        const payload =
            typeof response.data === 'object' &&
            response.data !== null &&
            'data' in response.data &&
            typeof response.data.data === 'object' &&
            response.data.data !== null &&
            'issueRelationDelete' in response.data.data
                ? response.data.data.issueRelationDelete
                : undefined;

        if (!payload) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Linear GraphQL API',
                response: response.data
            });
        }

        const providerPayload = ProviderDeletePayloadSchema.parse(payload);

        return {
            success: providerPayload.success,
            ...(providerPayload.entityId !== undefined && { entityId: providerPayload.entityId }),
            ...(providerPayload.lastSyncId !== undefined && { lastSyncId: providerPayload.lastSyncId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
