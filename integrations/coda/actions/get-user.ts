import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const WorkspaceSchema = z.object({
    id: z.string(),
    type: z.string(),
    organizationId: z.string().optional(),
    browserLink: z.string().optional(),
    name: z.string().optional()
});

const ProviderUserSchema = z.object({
    name: z.string(),
    loginId: z.string(),
    tokenName: z.string(),
    scoped: z.boolean(),
    workspace: WorkspaceSchema,
    type: z.string().optional(),
    href: z.string().optional(),
    pictureLink: z.string().optional()
});

const OutputSchema = z.object({
    name: z.string(),
    loginId: z.string(),
    tokenName: z.string(),
    scoped: z.boolean(),
    workspace: WorkspaceSchema
});

const action = createAction({
    description: "Retrieve the authenticated user's profile and workspace info.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'GET',
        path: '/actions/get-user'
    },

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Account/operation/whoami
            endpoint: '/whoami',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User info not found'
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            name: providerUser.name,
            loginId: providerUser.loginId,
            tokenName: providerUser.tokenName,
            scoped: providerUser.scoped,
            workspace: providerUser.workspace
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
