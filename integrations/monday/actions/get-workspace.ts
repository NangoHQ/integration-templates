import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    workspaceId: z.string().describe('The unique identifier of the monday.com workspace to retrieve.')
});

const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    kind: z.string().optional(),
    created_at: z.string().optional(),
    state: z.string().optional()
});

const RawWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    kind: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    state: z.string().nullable().optional()
});

const MondayGraphQLResponseSchema = z.object({
    data: z.object({
        workspaces: z.array(RawWorkspaceSchema)
    })
});

const MondayGraphQLErrorSchema = z.object({
    errors: z.array(
        z.object({
            message: z.string()
        })
    )
});

const action = createAction({
    description: 'Retrieve a single workspace from monday.com.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-workspace' },
    input: InputSchema,
    output: WorkspaceSchema,
    scopes: ['workspaces:read'],

    exec: async (nango, input) => {
        const query = `
            query {
                workspaces(ids: ${input.workspaceId}) {
                    id
                    name
                    description
                    kind
                    created_at
                    state
                }
            }
        `;

        // https://developer.monday.com/api-reference/reference/workspaces
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: { query },
            retries: 3
        });

        const errorParsed = MondayGraphQLErrorSchema.safeParse(response.data);
        if (errorParsed.success) {
            const messages = errorParsed.data.errors.map((err) => err.message).join('; ');
            throw new nango.ActionError(`monday.com GraphQL error: ${messages}`);
        }

        const parsed = MondayGraphQLResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError('Invalid response from monday.com API');
        }

        const workspaces = parsed.data.data.workspaces;

        if (workspaces.length === 0) {
            throw new nango.ActionError(`Workspace ${input.workspaceId} not found`);
        }

        const raw = workspaces[0];

        if (!raw) {
            throw new nango.ActionError(`Workspace ${input.workspaceId} not found`);
        }

        const workspace = {
            id: raw.id,
            name: raw.name,
            description: raw.description ?? undefined,
            kind: raw.kind ?? undefined,
            created_at: raw.created_at ?? undefined,
            state: raw.state ?? undefined
        };

        return workspace;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
