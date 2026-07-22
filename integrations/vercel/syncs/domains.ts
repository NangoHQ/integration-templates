import { createSync } from 'nango';
import { z } from 'zod';

const ProviderDomainSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.number(),
    expiresAt: z.number().nullable(),
    boughtAt: z.number().nullable(),
    verified: z.boolean(),
    nameservers: z.array(z.string()),
    intendedNameservers: z.array(z.string()),
    customNameservers: z.array(z.string()).optional(),
    creator: z.object({
        id: z.string(),
        username: z.string(),
        email: z.string()
    }),
    teamId: z.string().nullable(),
    userId: z.string(),
    renew: z.boolean().optional(),
    serviceType: z.enum(['external', 'na', 'zeit.world']),
    transferredAt: z.number().nullable().optional(),
    transferStartedAt: z.number().optional()
});

const DomainSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.number(),
    expiresAt: z.number().optional(),
    boughtAt: z.number().optional(),
    verified: z.boolean(),
    renew: z.boolean().optional(),
    serviceType: z.enum(['external', 'na', 'zeit.world']),
    teamId: z.string().optional(),
    userId: z.string(),
    transferredAt: z.number().optional(),
    transferStartedAt: z.number().optional(),
    nameservers: z.array(z.string()),
    intendedNameservers: z.array(z.string()),
    customNameservers: z.array(z.string()).optional(),
    creator: z
        .object({
            id: z.string(),
            username: z.string(),
            email: z.string()
        })
        .optional()
});

const CheckpointSchema = z.object({
    until: z.number()
});

const DomainListResponseSchema = z.object({
    domains: z.array(ProviderDomainSchema),
    pagination: z
        .object({
            next: z.number().nullable().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync account-level registered domains.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Domain: DomainSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let until = checkpoint?.until;

        // Blocker: /v5/domains only offers cursor pagination; it has no updated-since
        // filter or deleted-record feed. Keep the full snapshot strategy and use the
        // cursor only to resume interrupted runs.
        await nango.trackDeletesStart('Domain');

        while (true) {
            // https://vercel.com/docs/rest-api/domains/list-all-the-domains
            const response = await nango.get({
                endpoint: '/v5/domains',
                params: {
                    limit: 100,
                    ...(until !== undefined && { until })
                },
                retries: 3
            });

            const parsed = DomainListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse domains response: ${parsed.error.message}`);
            }

            const domains = parsed.data.domains.map((domain) => ({
                id: domain.id,
                name: domain.name,
                createdAt: domain.createdAt,
                ...(domain.expiresAt != null && { expiresAt: domain.expiresAt }),
                ...(domain.boughtAt != null && { boughtAt: domain.boughtAt }),
                verified: domain.verified,
                ...(domain.renew != null && { renew: domain.renew }),
                serviceType: domain.serviceType,
                ...(domain.teamId != null && { teamId: domain.teamId }),
                userId: domain.userId,
                ...(domain.transferredAt != null && { transferredAt: domain.transferredAt }),
                ...(domain.transferStartedAt != null && { transferStartedAt: domain.transferStartedAt }),
                nameservers: domain.nameservers,
                intendedNameservers: domain.intendedNameservers,
                ...(domain.customNameservers != null && { customNameservers: domain.customNameservers }),
                ...(domain.creator != null && { creator: domain.creator })
            }));

            if (domains.length > 0) {
                await nango.batchSave(domains, 'Domain');
            }

            const nextUntil = parsed.data.pagination?.next ?? undefined;
            if (nextUntil === undefined) {
                break;
            }

            until = nextUntil;
            await nango.saveCheckpoint({ until });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Domain');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
