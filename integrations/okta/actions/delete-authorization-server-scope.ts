import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    authServerId: z.string().describe('Authorization server ID. Example: "aus14u78liihuiepy698"'),
    scopeId: z.string().describe('Scope ID to delete. Example: "scp14y5t17kyZD0Pq698"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    authServerId: z.string(),
    scopeId: z.string()
});

const action = createAction({
    description: 'Delete a custom OAuth scope from an authorization server.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.authorizationServers.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.okta.com/docs/reference/api/authorization-servers/#delete-a-scope
            endpoint: `/api/v1/authorizationServers/${encodeURIComponent(input.authServerId)}/scopes/${encodeURIComponent(input.scopeId)}`,
            retries: 1
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Authorization server or scope not found.',
                authServerId: input.authServerId,
                scopeId: input.scopeId
            });
        }

        return {
            success: response.status >= 200 && response.status < 300,
            authServerId: input.authServerId,
            scopeId: input.scopeId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
