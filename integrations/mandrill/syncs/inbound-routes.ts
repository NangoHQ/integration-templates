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

const CheckpointSchema = z.object({
    processed_domains: z.string()
});

const sync = createSync({
    description: 'Sync all inbound mailbox routes across all known inbound domains',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        InboundRoute: InboundRouteModelSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const processedDomainsRaw = checkpoint?.['processed_domains'];
        const processedDomains = typeof processedDomainsRaw === 'string' ? processedDomainsRaw.split(',') : [];

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
        const remainingDomains = domains.filter((d) => !processedDomains.includes(d.domain));

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('InboundRoute');

        for (const domain of remainingDomains) {
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

            if (records.length > 0) {
                await nango.batchSave(records, 'InboundRoute');
            }

            // Save progress after every domain so a timeout resumes without re-querying
            // domains that were already successfully fetched and saved.
            processedDomains.push(domain.domain);
            await nango.saveCheckpoint({
                ['processed_domains']: processedDomains.join(',')
            });
        }

        // Clear the checkpoint only after the last domain has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('InboundRoute');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
