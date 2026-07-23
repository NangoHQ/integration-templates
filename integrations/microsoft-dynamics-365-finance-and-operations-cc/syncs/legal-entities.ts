import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderLegalEntitySchema = z.object({
    LegalEntityId: z.string(),
    Name: z.string().optional(),
    NameAlias: z.string().optional(),
    PartyNumber: z.string().optional()
});

const LegalEntitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    name_alias: z.string().optional(),
    party_number: z.string().optional()
});

const sync = createSync({
    description: 'Sync legal entities (companies/data areas).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LegalEntity: LegalEntitySchema
    },

    exec: async (nango) => {
        // Blocker: provider exposes no filterable modified-timestamp field on LegalEntities,
        // so this sync uses full-refresh with delete tracking.
        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/LegalEntities',
            params: {
                $top: 1
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_calculation_method: 'per-page',
                limit_name_in_request: '$top',
                limit: 1,
                response_path: 'value'
            },
            retries: 3
        };

        // Fetch and validate the first page before starting delete tracking, so a failed/invalid
        // first response doesn't leave delete-tracking open with zero records enumerated.
        const iterator = nango.paginate(proxyConfig)[Symbol.asyncIterator]();
        let result = await iterator.next();
        let trackingStarted = false;

        while (!result.done) {
            const records = z.array(ProviderLegalEntitySchema).parse(result.value);

            const legalEntities = records.map((record) => ({
                id: record.LegalEntityId,
                ...(record.Name != null && { name: record.Name }),
                ...(record.NameAlias != null && { name_alias: record.NameAlias }),
                ...(record.PartyNumber != null && { party_number: record.PartyNumber })
            }));

            if (!trackingStarted && legalEntities.length > 0) {
                await nango.trackDeletesStart('LegalEntity');
                trackingStarted = true;
            }

            if (legalEntities.length > 0) {
                await nango.batchSave(legalEntities, 'LegalEntity');
            }

            result = await iterator.next();
        }

        if (trackingStarted) {
            await nango.trackDeletesEnd('LegalEntity');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
