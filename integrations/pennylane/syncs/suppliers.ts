import { createSync } from 'nango';
import { toSupplier } from '../mappers/to-supplier.js';

import type { ProxyConfiguration } from 'nango';
import { PennylaneSupplier } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetches a list of suppliers from pennylane',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/suppliers',
            group: 'Suppliers'
        }
    ],

    scopes: ['supplier_invoices'],

    models: {
        PennylaneSupplier: PennylaneSupplier
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/suppliers-get
            endpoint: `/api/external/v1/suppliers`,
            retries: 10,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'suppliers'
            }
        };

        if (checkpointUpdatedAfter) {
            config.params = {
                filter: JSON.stringify([
                    {
                        field: 'updated_at',
                        operator: 'gteq',
                        value: checkpointUpdatedAfter.toISOString()
                    }
                ])
            };
        }

        for await (const response of nango.paginate<PennylaneSupplier>(config)) {
            const suppliers = response.map(toSupplier);
            await nango.batchSave(suppliers, 'PennylaneSupplier');
        }
        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
