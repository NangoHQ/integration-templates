import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID. Example: "384670636045300757"'),
    roles: z.array(z.string()).describe('Role names to assign. Example: ["assetviewer","complianceviewer"]'),
    included: z.string().describe('Included scope; pass empty string if unused.'),
    excluded: z.string().describe('Excluded scope; pass empty string if unused.'),
    first_name: z.string().describe('User first name.'),
    last_name: z.string().describe('User last name.'),
    email: z.string().describe('User email address.')
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
    status: z.boolean(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    status: z.boolean(),
    message: z.string().optional()
});

const MetadataSchema = z.object({
    tenant: z.string().optional()
});

const action = createAction({
    description: "Update a user's assigned roles.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const authResponse = await nango.post({
            // https://nango.dev/docs/api-integrations/connectsecure
            endpoint: '/w/authorize',
            retries: 3
        });

        const authData = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!authData.success) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Unable to authenticate with ConnectSecure authorize endpoint.'
            });
        }

        const token = authData.data.access_token;
        const userId = authData.data.user_id;

        const metadata = MetadataSchema.safeParse(await nango.getMetadata());
        if (!metadata.success || !metadata.data.tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Metadata must include tenant.'
            });
        }
        const tenant = metadata.data.tenant;

        const response = await nango.post({
            // https://nango.dev/docs/api-integrations/connectsecure
            endpoint: '/w/user/update_role',
            data: {
                user_id: input.user_id,
                roles: input.roles,
                included: input.included,
                excluded: input.excluded,
                first_name: input.first_name,
                last_name: input.last_name,
                email: input.email
            },
            headers: {
                Authorization: 'Bearer ' + token,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from ConnectSecure update_role endpoint.'
            });
        }

        return {
            status: parsed.data.status,
            ...(parsed.data.message !== undefined && { message: parsed.data.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
