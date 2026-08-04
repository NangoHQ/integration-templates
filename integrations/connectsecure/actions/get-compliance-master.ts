import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip offset). Omit for the first page.'),
    limit: z.number().int().min(1).max(5000).optional().describe('Maximum items per page. Defaults to 5000.')
});

const ProviderCheckSchema = z
    .object({
        check_id: z.string(),
        cis_control: z.string().nullish(),
        cis_safeguard: z.string().nullish(),
        cis_title: z.string().nullish(),
        command: z.string().nullish()
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

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()).optional(),
    status: z.boolean().optional(),
    total: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderCheckSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'Get the master list of compliance benchmark checks (e.g. CIS controls) with descriptions and remediation commands.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 5000;
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric skip offset'
            });
        }
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (!Number.isSafeInteger(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric skip offset'
            });
        }

        const metadata = await nango.getMetadata<{ tenant?: string }>();
        const tenant = metadata?.tenant;
        if (!tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Metadata must include tenant'
            });
        }

        const authResponse = await nango.post({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/w/authorize',
            data: {},
            retries: 3
        });

        const authData = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!authData.success) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access_token from /w/authorize'
            });
        }

        const token = authData.data.access_token;
        const userId = authData.data.user_id ?? '';

        const response = await nango.get({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/compliance/compliance_master',
            params: {
                skip: String(skip),
                limit: String(limit)
            },
            headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            retries: 3
        });

        const raw = ProviderResponseSchema.safeParse(response.data);
        if (!raw.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: `Unexpected response shape: ${raw.error.message}`
            });
        }

        const dataArray = raw.data.data ?? [];
        const total = raw.data.total ?? dataArray.length;

        const items = dataArray.map((item) => {
            const parsed = ProviderCheckSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: `Failed to parse compliance check item: ${parsed.error.message}`
                });
            }

            const normalized: { check_id: string; [key: string]: unknown } = { check_id: parsed.data.check_id };
            for (const [key, value] of Object.entries(parsed.data)) {
                if (value !== null && value !== undefined && key !== 'check_id') {
                    normalized[key] = value;
                }
            }

            return normalized;
        });

        const nextSkip = skip + items.length;
        const nextCursor = items.length > 0 && nextSkip < total ? String(nextSkip) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
