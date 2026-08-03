import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const FrameworkSchema = z.object({
    name: z.string(),
    table_name: z.string(),
    value: z.array(z.string())
});

const OutputSchema = z.object({
    frameworks: z.array(FrameworkSchema)
});

const MetadataSchema = z.object({
    tenant: z.string().optional()
});

const AuthorizeResponseSchema = z
    .object({
        access_token: z.string().optional(),
        user_id: z.union([z.string(), z.number()]).optional(),
        data: z
            .object({
                access_token: z.string().optional(),
                user_id: z.union([z.string(), z.number()]).optional()
            })
            .optional()
    })
    .transform((val) => ({
        access_token: val.access_token ?? val.data?.access_token,
        user_id: val.user_id !== undefined ? String(val.user_id) : val.data?.user_id !== undefined ? String(val.data.user_id) : undefined
    }))
    .refine((val): val is { access_token: string; user_id: string } => typeof val.access_token === 'string' && typeof val.user_id === 'string', {
        message: 'Authorize response missing access_token or user_id'
    });

const ProviderResponseSchema = z.object({
    data: z.array(FrameworkSchema),
    status: z.boolean().optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'List available compliance framework types and the OS/platform variants each supports.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const tenant = metadata.tenant;

        if (!tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'tenant is required in metadata'
            });
        }

        const authResponse = await nango.post({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/w/authorize',
            retries: 3
        });

        const authData = AuthorizeResponseSchema.parse(authResponse.data);
        const accessToken = authData.access_token;
        const userId = authData.user_id;

        if (!accessToken || !userId) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access token or user id from /w/authorize'
            });
        }

        const response = await nango.get({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/compliance/types',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            frameworks: providerResponse.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
