import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    asset_id: z
        .string()
        .regex(/^\d+$/, 'asset_id must be a numeric string')
        .describe('Asset ID. Example: "152060779"')
});

const ConnectionSchema = z
    .object({
        connection_config: z
            .object({
                tenant: z.string()
            })
            .optional()
    })
    .passthrough();

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

const ProviderAssetSchema = z
    .object({
        id: z.number().describe('Asset ID. Example: 152060779'),
        company_id: z.number().optional().describe('Company ID. Example: 16637'),
        host_name: z.string().optional().describe('Host name. Example: Victors-MBP')
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderAssetSchema),
    status: z.boolean(),
    total: z.number().optional()
});

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Get full details for a single asset by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = ConnectionSchema.parse(await nango.getConnection());
        const tenant = connection.connection_config?.tenant;

        if (!tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Connection config must include tenant.'
            });
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!authParsed.success) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access_token or user_id from /w/authorize'
            });
        }
        const accessToken = authParsed.data.access_token;
        const userId = authParsed.data.user_id;

        const response = await nango.get({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/asset/asset_view',
            params: {
                condition: `id=${input.asset_id}`
            },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-User-Id': userId,
                'X-Tenant-Id': tenant
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const asset = providerResponse.data[0];

        if (!asset) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Asset not found',
                asset_id: input.asset_id
            });
        }

        return asset;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
