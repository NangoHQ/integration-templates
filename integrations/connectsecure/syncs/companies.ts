import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CompanySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const ConnectionConfigSchema = z.object({
    tenant: z.string()
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

const CompanyItemSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        name: z.string().nullish(),
        created: z.string().nullish(),
        updated: z.string().nullish()
    })
    .passthrough();

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync MSP client companies in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const checkpointParsed = checkpoint == null ? null : CheckpointSchema.safeParse(checkpoint);
        if (checkpointParsed != null && !checkpointParsed.success) {
            throw new Error(`Invalid checkpoint: ${checkpointParsed.error.message}`);
        }
        let offset: number | undefined = checkpointParsed?.success ? (checkpointParsed.data.offset ?? 0) : 0;

        const connection = await nango.getConnection();
        const parsedConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        let tenant = parsedConfig.success ? parsedConfig.data.tenant : undefined;

        if (!tenant) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.record(z.string(), z.unknown());
            const metadataParsed = MetadataSchema.safeParse(metadata);
            if (metadataParsed.success) {
                const fromMeta = metadataParsed.data['tenant'];
                tenant = typeof fromMeta === 'string' ? fromMeta : undefined;
            }
        }

        if (!tenant) {
            throw new Error('Connection config must include tenant.');
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/w/authorize',
            retries: 3
        });

        const parsedAuth = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!parsedAuth.success) {
            throw new Error('Failed to obtain access_token or user_id from /w/authorize');
        }
        const { access_token: accessToken, user_id: userId } = parsedAuth.data;

        await nango.trackDeletesStart('Company');

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const proxyConfig: ProxyConfiguration = {
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/company/companies',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_calculation_method: 'by-response-size',
                offset_start_value: offset,
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const companies = page.map((item: unknown) => {
                const parsed = CompanyItemSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse company: ${parsed.error.message}`);
                }
                const record = parsed.data;
                return {
                    id: String(record.id),
                    ...(record.name != null && { name: record.name }),
                    ...(record.created != null && { created: record.created }),
                    ...(record.updated != null && { updated: record.updated })
                };
            });

            if (companies.length > 0) {
                await nango.batchSave(companies, 'Company');
            }

            offset = (offset ?? 0) + page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Company');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
