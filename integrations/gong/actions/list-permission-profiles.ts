import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().describe('Workspace ID. Example: "7273476131570014205"')
});

const PermissionProfileSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    profiles: z.array(PermissionProfileSchema)
});

const action = createAction({
    description: 'List all permission profiles in a Gong workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-permission-profiles',
        group: 'Permissions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:permission-profile:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch The permission profiles endpoint is plan-gated and may return 404.
        // We treat 404 as an empty result rather than a hard failure.
        try {
            response = await nango.get({
                // https://help.gong.io/docs/what-the-gong-api-provides
                endpoint: '/v2/all-permission-profiles',
                params: {
                    workspaceId: input.workspaceId
                },
                retries: 3
            });
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof error.response === 'object' &&
                error.response !== null &&
                'status' in error.response &&
                error.response.status === 404
            ) {
                return {
                    profiles: []
                };
            }
            throw error;
        }

        const unknownData = response.data;
        if (typeof unknownData !== 'object' || unknownData === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an object response from Gong API.'
            });
        }

        const profilesArray = 'profiles' in unknownData && Array.isArray(unknownData.profiles) ? unknownData.profiles : [];

        const profiles: { id: string; name?: string; description?: string }[] = [];
        for (const item of profilesArray) {
            if (typeof item !== 'object' || item === null) {
                continue;
            }
            const id = 'id' in item && typeof item.id === 'string' ? item.id : '';
            if (!id) {
                continue;
            }
            profiles.push({
                id,
                ...('name' in item && typeof item.name === 'string' && { name: item.name }),
                ...('description' in item && typeof item.description === 'string' && { description: item.description })
            });
        }

        return {
            profiles
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
