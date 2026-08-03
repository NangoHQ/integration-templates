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

const VulnerabilitySchema = z.object({
    id: z.string(),
    problem_name: z.string().optional(),
    base_score: z.number().optional(),
    severity: z.string().optional(),
    description: z.string().optional(),
    affected_assets: z.number().optional(),
    affected_companies: z.number().optional(),
    asset_ids: z.array(z.number()).optional(),
    epss_score: z.number().optional(),
    exploitability_score: z.number().optional(),
    impact_score: z.number().optional(),
    total_count: z.number().optional()
});

const sync = createSync({
    description: 'Sync distinct vulnerabilities (CVEs) detected across assets in this account',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Vulnerability: VulnerabilitySchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

        const baseUrl =
            typeof metadata === 'object' && metadata !== null && 'base_url' in metadata && typeof metadata['base_url'] === 'string'
                ? metadata['base_url']
                : undefined;
        const tenant =
            typeof metadata === 'object' && metadata !== null && 'tenant' in metadata && typeof metadata['tenant'] === 'string'
                ? metadata['tenant']
                : undefined;

        let userId: string | undefined;
        if (typeof metadata === 'object' && metadata !== null && 'connection_config' in metadata) {
            const metadataConnectionConfig = metadata['connection_config'];
            if (
                typeof metadataConnectionConfig === 'object' &&
                metadataConnectionConfig !== null &&
                'user_id' in metadataConnectionConfig &&
                typeof metadataConnectionConfig['user_id'] === 'string'
            ) {
                userId = metadataConnectionConfig['user_id'];
            }
        }

        if (!baseUrl || !tenant) {
            throw new Error('Metadata must include base_url and tenant');
        }

        // https://nango.dev/docs/api-integrations/connectsecure
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.safeParse(authResponse.data);
        const accessToken = authParsed.success ? authParsed.data.access_token : undefined;

        if (!accessToken) {
            throw new Error('Failed to extract access_token from /w/authorize response');
        }

        await nango.trackDeletesStart('Vulnerability');

        const proxyConfig: ProxyConfiguration = {
            // https://nango.dev/docs/api-integrations/connectsecure
            endpoint: '/r/report_queries/vulnerabilities_details',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Tenant-Id': tenant,
                Accept: 'application/json',
                ...(typeof userId === 'string' && { 'X-User-Id': userId })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 500,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                continue;
            }

            const vulnerabilities = [];
            for (const raw of page) {
                if (raw === null || typeof raw !== 'object') {
                    continue;
                }

                const problemName = 'problem_name' in raw && typeof raw.problem_name === 'string' ? raw.problem_name : null;
                if (!problemName) {
                    continue;
                }

                const baseScore = 'base_score' in raw && typeof raw.base_score === 'number' ? raw.base_score : undefined;
                const severity = 'severity' in raw && typeof raw.severity === 'string' ? raw.severity : undefined;
                const description = 'description' in raw && typeof raw.description === 'string' ? raw.description : undefined;
                const affectedAssets = 'affected_assets' in raw && typeof raw.affected_assets === 'number' ? raw.affected_assets : undefined;
                const affectedCompanies = 'affected_companies' in raw && typeof raw.affected_companies === 'number' ? raw.affected_companies : undefined;
                const assetIds =
                    'asset_ids' in raw && Array.isArray(raw.asset_ids)
                        ? raw.asset_ids.filter((id: unknown): id is number => typeof id === 'number')
                        : undefined;
                const epssScore = 'epss_score' in raw && typeof raw.epss_score === 'number' ? raw.epss_score : undefined;
                const exploitabilityScore =
                    'exploitability_score' in raw && typeof raw.exploitability_score === 'number' ? raw.exploitability_score : undefined;
                const impactScore = 'impact_score' in raw && typeof raw.impact_score === 'number' ? raw.impact_score : undefined;
                const totalCount = 'total_count' in raw && typeof raw.total_count === 'number' ? raw.total_count : undefined;

                vulnerabilities.push({
                    id: problemName,
                    ...(problemName !== undefined && { problem_name: problemName }),
                    ...(baseScore !== undefined && { base_score: baseScore }),
                    ...(severity !== undefined && { severity }),
                    ...(description !== undefined && { description }),
                    ...(affectedAssets !== undefined && { affected_assets: affectedAssets }),
                    ...(affectedCompanies !== undefined && { affected_companies: affectedCompanies }),
                    ...(assetIds !== undefined && { asset_ids: assetIds }),
                    ...(epssScore !== undefined && { epss_score: epssScore }),
                    ...(exploitabilityScore !== undefined && { exploitability_score: exploitabilityScore }),
                    ...(impactScore !== undefined && { impact_score: impactScore }),
                    ...(totalCount !== undefined && { total_count: totalCount })
                });
            }

            if (vulnerabilities.length > 0) {
                const seenIds = new Set<string>();
                const deduplicated: Array<{
                    id: string;
                    problem_name?: string;
                    base_score?: number;
                    severity?: string;
                    description?: string;
                    affected_assets?: number;
                    affected_companies?: number;
                    asset_ids?: number[];
                    epss_score?: number;
                    exploitability_score?: number;
                    impact_score?: number;
                    total_count?: number;
                }> = [];
                for (let i = vulnerabilities.length - 1; i >= 0; i--) {
                    const record = vulnerabilities[i];
                    if (record && !seenIds.has(record.id)) {
                        seenIds.add(record.id);
                        deduplicated.unshift(record);
                    }
                }
                await nango.batchSave(deduplicated, 'Vulnerability');
            }
        }

        await nango.trackDeletesEnd('Vulnerability');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
