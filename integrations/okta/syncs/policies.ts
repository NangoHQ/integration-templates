import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PolicySchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    system: z.boolean().optional()
});

const OktaErrorSchema = z
    .object({
        errorSummary: z.string().optional()
    })
    .passthrough();

const MISSING_FEATURE_FLAG_MARKER = 'Missing Required Feature Flag';

const CheckpointSchema = z.object({
    type_index: z.number().int().min(0),
    after: z.string()
});

const StoredCheckpointSchema = z.object({
    type_index: z.number().int().min(0).optional(),
    after: z.string().optional()
});

function extractNextAfter(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (!match || match[1] === undefined) {
        return undefined;
    }
    try {
        const url = new URL(match[1]);
        return url.searchParams.get('after') || undefined;
    } catch {
        return undefined;
    }
}

const sync = createSync({
    description: 'Sync policies.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Policy: PolicySchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = StoredCheckpointSchema.safeParse(rawCheckpoint ?? {});
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : {};

        // Full documented policy type list (see Okta's PolicyType enum). Some types are
        // gated behind org-specific feature flags/plan tiers (e.g. DEVICE_SIGNAL_COLLECTION,
        // ENTITY_RISK) and return a 400 "Missing Required Feature Flag" error for orgs that
        // don't have them enabled, so each type is fetched independently and skipped on error
        // rather than aborting the whole sync or leaving other types' policies untouched.
        const policyTypes = [
            'OKTA_SIGN_ON',
            'PASSWORD',
            'MFA_ENROLL',
            'IDP_DISCOVERY',
            'ACCESS_POLICY',
            'PROFILE_ENROLLMENT',
            'ENTITY_RISK',
            'POST_AUTH_SESSION',
            'DEVICE_SIGNAL_COLLECTION',
            'SESSION_VIOLATION_DETECTION',
            'CLIENT_UPDATE',
            'IDENTITY_CLAIM_SOURCING'
        ];

        let typeIndex = checkpoint.type_index ?? 0;
        let after = checkpoint.after;

        await nango.trackDeletesStart('Policy');

        while (typeIndex < policyTypes.length) {
            const policyType = policyTypes[typeIndex];
            if (!policyType) {
                throw new Error(`Unexpected missing policy type at index ${typeIndex}`);
            }
            let hasMorePages = true;
            let currentAfter = typeIndex === (checkpoint.type_index ?? 0) ? after : undefined;

            try {
                while (hasMorePages) {
                    const params: Record<string, string | number> = {
                        type: policyType,
                        limit: 200
                    };
                    if (typeof currentAfter === 'string' && currentAfter.length > 0) {
                        params['after'] = currentAfter;
                    }

                    const proxyConfig: ProxyConfiguration = {
                        // https://developer.okta.com/docs/reference/api/policy/
                        endpoint: '/api/v1/policies',
                        params,
                        retries: 3
                    };

                    const response = await nango.get(proxyConfig);

                    if (!Array.isArray(response.data)) {
                        const parsedError = OktaErrorSchema.safeParse(response.data);
                        const errorSummary = parsedError.success ? parsedError.data.errorSummary : undefined;
                        throw new Error(errorSummary ?? `Expected array from policies endpoint, got ${typeof response.data}`);
                    }

                    const policies = [];
                    for (const item of response.data) {
                        const parsed = PolicySchema.safeParse(item);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse policy of type ${policyType}: ${parsed.error.message}`);
                        }
                        policies.push(parsed.data);
                    }

                    if (policies.length > 0) {
                        await nango.batchSave(policies, 'Policy');
                    }

                    const nextAfter = extractNextAfter(response.headers['link']);
                    if (nextAfter !== undefined) {
                        currentAfter = nextAfter;
                        await nango.saveCheckpoint({
                            type_index: typeIndex,
                            after: nextAfter
                        });
                    } else {
                        hasMorePages = false;
                    }
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                // Only skip the specific "org doesn't have this policy type enabled" case.
                // Any other failure (transient network error, parse error, etc.) must abort
                // the sync rather than let trackDeletesEnd finalize on partial enumeration.
                if (!message.includes(MISSING_FEATURE_FLAG_MARKER)) {
                    throw err;
                }
                await nango.log(`Skipping policy type ${policyType}: ${message}`, { level: 'warn' });
            }

            typeIndex += 1;
            after = undefined;

            if (typeIndex < policyTypes.length) {
                await nango.saveCheckpoint({
                    type_index: typeIndex,
                    after: ''
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Policy');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
