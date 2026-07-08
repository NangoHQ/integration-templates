import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const AuthorizationServerSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        audiences: z.array(z.string()),
        issuer: z.string(),
        issuerMode: z.string().nullable().optional(),
        status: z.string(),
        created: z.string().nullable().optional(),
        lastUpdated: z.string().nullable().optional(),
        credentials: z
            .object({
                signing: z
                    .object({
                        rotationMode: z.string().nullable().optional(),
                        lastRotated: z.string().nullable().optional(),
                        nextRotation: z.string().nullable().optional(),
                        kid: z.string().nullable().optional(),
                        use: z.string().nullable().optional()
                    })
                    .nullable()
                    .optional()
            })
            .nullable()
            .optional(),
        jwks_uri: z.string().nullable().optional(),
        accessTokenEncryptedResponseAlgorithm: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(AuthorizationServerSchema),
    next_cursor: z.string().optional()
});

function getHeaderValue(headers: unknown, name: string): string | undefined {
    if (typeof headers !== 'object' || headers === null) {
        return undefined;
    }
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === name.toLowerCase()) {
            return typeof value === 'string' ? value : undefined;
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List authorization servers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.authorizationServers.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/authorization-servers/
            endpoint: '/api/v1/authorizationServers',
            params: {
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        const items = z.array(AuthorizationServerSchema).parse(response.data);

        const linkHeader = getHeaderValue(response.headers, 'link');
        let next_cursor: string | undefined;
        if (typeof linkHeader === 'string') {
            const match = linkHeader.match(/<[^>]+[?&]after=([^&>]+)[^>]*>; rel="next"/i);
            if (match && match[1] !== undefined) {
                next_cursor = decodeURIComponent(match[1]);
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
