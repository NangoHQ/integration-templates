import { createSync } from 'nango';
import { toProduct } from '../mappers/to-product.js';

import type { ProxyConfiguration } from 'nango';
import { PennylaneProduct } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetches a list products from pennylane',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/products',
            group: 'Products'
        }
    ],

    scopes: ['accounting'],

    models: {
        PennylaneProduct: PennylaneProduct
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/customers-get-1
            endpoint: `/api/external/v1/products`,
            retries: 10,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'products'
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

        for await (const response of nango.paginate<PennylaneProduct>(config)) {
            const products = response.map(toProduct);
            await nango.batchSave(products, 'PennylaneProduct');
        }
        await nango.saveCheckpoint({ updated_after: runStartedAt });

    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
