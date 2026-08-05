import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const InitiativeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    projects: z.array(ProjectSchema).optional()
});

const ProviderProjectNodeSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional()
});

const ProviderInitiativeNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    projects: z
        .object({
            nodes: z.array(ProviderProjectNodeSchema).optional().nullable()
        })
        .optional()
        .nullable()
});

const sync = createSync({
    description: 'Sync Linear initiatives and their project relationships',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['read'],
    endpoints: [{ method: 'GET', path: '/syncs/initiatives' }],
    models: {
        Initiative: InitiativeSchema
    },

    exec: async (nango) => {
        // Blocker: no incremental filter was live-tested end-to-end for initiatives.
        // updatedAt fields exist but were not verified for this resource in this pass.
        let deleteTrackingStarted = false;

        const proxyConfig: ProxyConfiguration = {
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            method: 'POST',
            data: {
                query: `
                    query Initiatives($after: String, $first: Int) {
                        initiatives(after: $after, first: $first) {
                            nodes {
                                id
                                name
                                description
                                status
                                createdAt
                                updatedAt
                                projects {
                                    nodes {
                                        id
                                        name
                                    }
                                }
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first: 50
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.initiatives.pageInfo.endCursor',
                response_path: 'data.initiatives.nodes',
                limit_name_in_request: 'variables.first',
                limit: 50
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array from Linear initiatives query');
            }

            const initiatives = page
                .map((raw) => {
                    const parsed = ProviderInitiativeNodeSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse initiative node: ${parsed.error.message}`);
                    }
                    return parsed.data;
                })
                .map((node) => {
                    const projects =
                        node.projects?.nodes != null
                            ? node.projects.nodes.map((p) => ({
                                  id: p.id,
                                  ...(p.name != null && { name: p.name })
                              }))
                            : undefined;

                    return {
                        id: node.id,
                        name: node.name,
                        ...(node.description != null && { description: node.description }),
                        ...(node.status != null && { status: node.status }),
                        createdAt: node.createdAt,
                        updatedAt: node.updatedAt,
                        ...(projects != null && { projects })
                    };
                });

            // Start delete tracking only once a page has been fetched and fully validated, so a failed
            // request never opens tracking. If a later page fails, the thrown error aborts the run before
            // trackDeletesEnd, so tracking is never finalized on a partial dataset.
            if (!deleteTrackingStarted) {
                await nango.trackDeletesStart('Initiative');
                deleteTrackingStarted = true;
            }

            if (initiatives.length > 0) {
                await nango.batchSave(initiatives, 'Initiative');
            }
        }

        if (deleteTrackingStarted) {
            await nango.trackDeletesEnd('Initiative');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
