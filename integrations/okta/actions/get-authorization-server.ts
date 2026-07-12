import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    authServerId: z.string().describe('Authorization server ID. Use "default" for the org\'s default server. Example: "default"')
});

const LinkSchema = z
    .object({
        href: z.string(),
        hints: z
            .object({
                allow: z.array(z.string()).optional()
            })
            .optional(),
        name: z.string().optional(),
        templated: z.boolean().optional(),
        type: z.string().optional()
    })
    .passthrough();

const LinksSchema = z
    .object({
        self: LinkSchema.optional(),
        claims: LinkSchema.optional(),
        deactivate: LinkSchema.optional(),
        metadata: z.array(LinkSchema).optional(),
        policies: LinkSchema.optional(),
        rotateKey: LinkSchema.optional(),
        scopes: LinkSchema.optional()
    })
    .passthrough();

const SigningCredentialSchema = z
    .object({
        kid: z.string().optional(),
        lastRotated: z.string().optional(),
        nextRotation: z.string().optional(),
        rotationMode: z.string().optional(),
        use: z.string().optional()
    })
    .passthrough();

const CredentialsSchema = z
    .object({
        signing: SigningCredentialSchema.optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        audiences: z.array(z.string()).optional(),
        issuer: z.string().optional(),
        issuerMode: z.string().optional(),
        status: z.string().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        credentials: CredentialsSchema.optional(),
        _links: LinksSchema.optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve an authorization server',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.authorizationServers.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/authorization-servers/
            endpoint: `/api/v1/authorizationServers/${encodeURIComponent(input.authServerId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Authorization server not found',
                authServerId: input.authServerId
            });
        }

        const server = OutputSchema.parse(response.data);

        return server;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
