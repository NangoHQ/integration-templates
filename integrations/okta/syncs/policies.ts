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

const sync = createSync({
    description: 'Sync policies.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Policy: PolicySchema
    },

    exec: async (nango) => {
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

        await nango.trackDeletesStart('Policy');

        for (const policyType of policyTypes) {
            const proxyConfig: ProxyConfiguration = {
                // https://developer.okta.com/docs/reference/api/policy/
                endpoint: '/api/v1/policies',
                params: {
                    type: policyType,
                    limit: 200
                },
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'limit',
                    limit: 200
                },
                retries: 3
            };

            try {
                for await (const page of nango.paginate(proxyConfig)) {
                    if (!Array.isArray(page)) {
                        throw new Error(`Expected array from policies endpoint, got ${typeof page}`);
                    }

                    const policies = [];
                    for (const item of page) {
                        const parsed = PolicySchema.safeParse(item);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse policy of type ${policyType}: ${parsed.error.message}`);
                        }
                        policies.push(parsed.data);
                    }

                    if (policies.length > 0) {
                        await nango.batchSave(policies, 'Policy');
                    }
                }
            } catch (err) {
                await nango.log(`Skipping policy type ${policyType}: ${err instanceof Error ? err.message : String(err)}`, { level: 'warn' });
            }
        }

        await nango.trackDeletesEnd('Policy');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
