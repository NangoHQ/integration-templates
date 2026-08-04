import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

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

const ProviderComplianceMasterSchema = z
    .object({
        check_id: z.string(),
        cis_control: z.string().optional().nullable(),
        cis_title: z.string().optional().nullable(),
        remediation: z.string().optional().nullable()
    })
    .passthrough();

const ComplianceMasterCheckSchema = z.object({
    id: z.string().describe('Unique check identifier'),
    cis_control: z.string().optional(),
    cis_title: z.string().optional(),
    remediation: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number()
});

const sync = createSync({
    description: 'Sync the master list of compliance benchmark checks (e.g. CIS controls).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    trackDeletes: true,
    checkpoint: CheckpointSchema,
    models: {
        ComplianceMasterCheck: ComplianceMasterCheckSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        if (checkpoint != null && typeof checkpoint.offset !== 'number') {
            throw new Error('Invalid checkpoint: offset must be a number');
        }

        // Full refresh with delete tracking: start from page 1 every run.
        let offset = 0;

        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata();
        const tenant = connection?.connection_config?.['tenant'] ?? metadata?.['tenant'];
        if (typeof tenant !== 'string') {
            throw new Error('Missing tenant in connection config or metadata');
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const parsedAuth = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!parsedAuth.success) {
            throw new Error('Failed to obtain access_token or user_id from /w/authorize');
        }

        const token = parsedAuth.data.access_token;
        const userId = parsedAuth.data.user_id;

        await nango.trackDeletesStart('ComplianceMasterCheck');

        const proxyConfig: ProxyConfiguration = {
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/compliance/compliance_master',
            headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 5000,
                response_path: 'data',
                on_page: async (paginationState) => {
                    offset = typeof paginationState.nextPageParam === 'number' ? paginationState.nextPageParam : 0;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(ProviderComplianceMasterSchema).safeParse(page);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse compliance master page: ${parsedPage.error.message}`);
            }

            const checks = parsedPage.data.map((record) => {
                const rawRemediationCommand = typeof record['remediation_command'] === 'string' ? record['remediation_command'] : undefined;

                const remediation = record.remediation ?? rawRemediationCommand;

                return {
                    id: record.check_id,
                    ...(record.cis_control != null && { cis_control: record.cis_control }),
                    ...(record.cis_title != null && { cis_title: record.cis_title }),
                    ...(remediation != null && { remediation })
                };
            });

            if (checks.length > 0) {
                await nango.batchSave(checks, 'ComplianceMasterCheck');
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.trackDeletesEnd('ComplianceMasterCheck');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
