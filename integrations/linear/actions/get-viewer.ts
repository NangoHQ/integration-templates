import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    id: z.string().describe('User ID. Example: "user-123"'),
    name: z.string().describe('Full name. Example: "Jane Doe"'),
    email: z.string().describe('Email address. Example: "jane@example.com"'),
    displayName: z.union([z.string(), z.null()]).describe('Display name. Example: "Jane"'),
    avatarUrl: z.union([z.string(), z.null()]).describe('Avatar URL'),
    organization: z
        .object({
            id: z.string(),
            name: z.string(),
            slug: z.string()
        })
        .describe('Organization context')
});

const action = createAction({
    description: 'Retrieve the currently authenticated Linear user',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-viewer',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers/api-reference/viewer
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    query {
                        viewer {
                            id
                            name
                            email
                            displayName
                            avatarUrl
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

        const viewer = response.data.data?.viewer;
        if (!viewer) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Viewer not found'
            });
        }

        return {
            id: viewer.id,
            name: viewer.name,
            email: viewer.email,
            displayName: viewer.displayName ?? null,
            avatarUrl: viewer.avatarUrl ?? null,
            organization: {
                id: viewer.organization.id,
                name: viewer.organization.name,
                slug: viewer.organization.urlKey
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
