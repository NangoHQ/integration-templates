import { createSync } from 'nango';
import { z } from 'zod';

const InboundDomainSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    valid_mx: z.boolean().optional()
});

const InboundRouteSchema = z.object({
    id: z.string(),
    pattern: z.string(),
    url: z.string()
});

const InboundRouteModelSchema = z.object({
    id: z.string(),
    domain: z.string(),
    route_id: z.string(),
    pattern: z.string(),
    url: z.string()
});

const sync = createSync({
    description: 'Sync all inbound mailbox routes across all known inbound domains',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        InboundRoute: InboundRouteModelSchema
    },

    exec: async (nango) => {
        // https://mailchimp.com/developer/transactional/api/inbound/list-inbound-domains/
        const domainsResponse = await nango.post({
            endpoint: '/1.4/inbound/domains.json',
            data: {},
            retries: 3
        });

        const parsedDomains = z.array(InboundDomainSchema).safeParse(domainsResponse.data);
        if (!parsedDomains.success) {
            throw new Error(`Failed to parse inbound domains: ${parsedDomains.error.message}`);
        }

        const domains = parsedDomains.data;

        const recordsByDomain: { domain: string; records: z.infer<typeof InboundRouteModelSchema>[] }[] = [];

        for (const domain of domains) {
            // https://mailchimp.com/developer/transactional/api/inbound/list-routes/
            const routesResponse = await nango.post({
                endpoint: '/1.4/inbound/routes.json',
                data: {
                    domain: domain.domain
                },
                retries: 3
            });

            const parsedRoutes = z.array(InboundRouteSchema).safeParse(routesResponse.data);
            if (!parsedRoutes.success) {
                throw new Error(`Failed to parse inbound routes for domain ${domain.domain}: ${parsedRoutes.error.message}`);
            }

            const records = parsedRoutes.data.map((route) => ({
                id: `${domain.domain}:${route.id}`,
                domain: domain.domain,
                route_id: route.id,
                pattern: route.pattern,
                url: route.url
            }));

            recordsByDomain.push({ domain: domain.domain, records });
        }

        await nango.trackDeletesStart('InboundRoute');

        for (const { records } of recordsByDomain) {
            if (records.length > 0) {
                await nango.batchSave(records, 'InboundRoute');
            }
        }

        await nango.trackDeletesEnd('InboundRoute');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
