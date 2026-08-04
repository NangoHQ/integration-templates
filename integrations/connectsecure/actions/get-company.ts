import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    company_id: z.number().describe('Company ID. Example: 16637')
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

const ProviderCompanySchema = z
    .object({
        id: z.coerce.number(),
        name: z.string().nullish(),
        description: z.string().nullish(),
        tenantid: z.coerce.number().nullish(),
        created: z.string().nullish(),
        updated: z.string().nullish(),
        is_deleted: z.boolean().nullish(),
        compliance_scan: z.boolean().nullish(),
        external_scan: z.boolean().nullish(),
        internal_scan: z.boolean().nullish()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    data: z.array(ProviderCompanySchema),
    status: z.boolean(),
    total: z.number()
});

const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        tenant_id: z.number().optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        is_deleted: z.boolean().optional(),
        compliance_scan: z.boolean().optional(),
        external_scan: z.boolean().optional(),
        internal_scan: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get a single MSP client company by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ tenant?: string }>();
        const tenantId = metadata?.tenant;

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'tenant is required in connection metadata.'
            });
        }

        const authResponse = await nango.post({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
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
        const authData = authParsed.data;

        const response = await nango.get({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/company/companies',
            params: {
                condition: `id=${input.company_id}`
            },
            headers: {
                Authorization: `Bearer ${authData.access_token}`,
                'X-Tenant-Id': tenantId,
                'X-User-Id': authData.user_id
            },
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);

        if (!listResponse.data || listResponse.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Company with id ${input.company_id} not found.`
            });
        }

        const company = listResponse.data[0];

        if (!company) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Company with id ${input.company_id} not found.`
            });
        }

        const output: Record<string, unknown> = {
            id: company.id,
            name: company.name ?? undefined,
            description: company.description ?? undefined,
            tenant_id: company.tenantid ?? undefined,
            created: company.created ?? undefined,
            updated: company.updated ?? undefined,
            is_deleted: company.is_deleted ?? undefined,
            compliance_scan: company.compliance_scan ?? undefined,
            external_scan: company.external_scan ?? undefined,
            internal_scan: company.internal_scan ?? undefined
        };

        for (const [key, value] of Object.entries(company)) {
            if (!(key in output)) {
                output[key] = value;
            }
        }

        return OutputSchema.parse(output);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
