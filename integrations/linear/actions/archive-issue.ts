import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the issue to archive. Example: "c0b0b0b0-0000-0000-0000-000000000000" or "TEAM-123"')
});

const ProviderIssueSchema = z.object({
    id: z.string(),
    identifier: z.string().optional(),
    title: z.string().optional(),
    archivedAt: z.string().nullable().optional(),
    state: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            issueArchive: z
                .object({
                    success: z.boolean(),
                    lastSyncId: z.number().optional(),
                    entity: ProviderIssueSchema.nullable().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    issue: z
        .object({
            id: z.string(),
            identifier: z.string().optional(),
            title: z.string().optional(),
            archivedAt: z.string().optional(),
            state: z
                .object({
                    id: z.string().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional()
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
        const query = `
            mutation IssueArchive($id: String!) {
                issueArchive(id: $id) {
                    success
                    lastSyncId
                    entity {
                        id
                        identifier
                        title
                        archivedAt
                        state {
                            id
                            name
                        }
                    }
                }
            }
        `;

        const config: ProxyConfiguration = {
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        };

        // https://linear.app/developers/graphql
        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.parse(response.data);
        const payload = parsed.data?.issueArchive;

        if (!payload) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Linear did not return an issueArchive payload.'
            });
        }

        if (!payload.success) {
            throw new nango.ActionError({
                type: 'archive_failed',
                message: 'Linear reported that the archive operation was not successful.',
                issueId: input.id
            });
        }

        const entity = payload.entity;

        return {
            success: payload.success,
            ...(entity != null && {
                issue: {
                    id: entity.id,
                    ...(entity.identifier != null && { identifier: entity.identifier }),
                    ...(entity.title != null && { title: entity.title }),
                    ...(entity.archivedAt != null && { archivedAt: entity.archivedAt }),
                    ...(entity.state != null && {
                        state: {
                            ...(entity.state.id != null && { id: entity.state.id }),
                            ...(entity.state.name != null && { name: entity.state.name })
                        }
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
