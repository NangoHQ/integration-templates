import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    authServerId: z.string().describe('Authorization server ID. Example: "aus14u78liihuiepy698"')
});

const ClaimConditionSchema = z.object({
    scopes: z.array(z.string()).optional(),
    grantTypes: z.array(z.string()).optional()
});

const ClaimSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    claimType: z.string().optional(),
    valueType: z.string().optional(),
    value: z.string().optional(),
    alwaysIncludeInToken: z.boolean().optional(),
    conditions: ClaimConditionSchema.optional(),
    system: z.boolean().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional()
});

const OutputSchema = z.object({
    claims: z.array(ClaimSchema)
});

const action = createAction({
    description: 'List the token claims defined on an authorization server.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.authorizationServers.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/authorization-servers/#get-a-claim
            endpoint: `/api/v1/authorizationServers/${encodeURIComponent(input.authServerId)}/claims`,
            retries: 3
        });

        const providerClaims = z.array(ClaimSchema).parse(response.data);

        return {
            claims: providerClaims
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
