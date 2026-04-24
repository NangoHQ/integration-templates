import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    urlKey: z.string().nullable().optional()
});

const ProviderViewerSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    organization: ProviderOrganizationSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    avatarUrl: z.string().optional(),
    displayName: z.string().optional(),
    organization: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            urlKey: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve the currently authenticated Linear user.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-viewer',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['viewer'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/api/graphql#viewer
            endpoint: '/graphql',
            data: {
                query: `
                    query {
                        viewer {
                            id
                            name
                            email
                            avatarUrl
                            displayName
                            organization {
                                id
                                name
                                urlKey
                            }
                        }
                    }
                `
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API'
            });
        }

        const responseShape = z
            .object({
                data: z
                    .object({
                        viewer: z.unknown()
                    })
                    .optional()
            })
            .parse(raw);

        const viewerData = responseShape.data?.viewer;
        if (!viewerData || typeof viewerData !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Viewer not found in response'
            });
        }

        const providerViewer = ProviderViewerSchema.parse(viewerData);

        return {
            id: providerViewer.id,
            ...(providerViewer.name != null && { name: providerViewer.name }),
            ...(providerViewer.email != null && { email: providerViewer.email }),
            ...(providerViewer.avatarUrl != null && { avatarUrl: providerViewer.avatarUrl }),
            ...(providerViewer.displayName != null && { displayName: providerViewer.displayName }),
            ...(providerViewer.organization != null && {
                organization: {
                    id: providerViewer.organization.id,
                    ...(providerViewer.organization.name != null && { name: providerViewer.organization.name }),
                    ...(providerViewer.organization.urlKey != null && { urlKey: providerViewer.organization.urlKey })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
