import { createSync } from 'nango';
import { toSupplier } from '../mappers/to-supplier.js';

import type { ProxyConfiguration } from 'nango';
import { PennylaneSupplier } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of suppliers from pennylane',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',

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

        if (nango.lastSyncDate) {
            config.params = {
                filter: JSON.stringify([
                    {
                        field: 'updated_at',
                        operator: 'gteq',
                        value: nango.lastSyncDate.toISOString()
                    }
                ])
            };
        }

        for await (const response of nango.paginate<PennylaneSupplier>(config)) {
            const suppliers = response.map(toSupplier);
            await nango.batchSave(suppliers, 'PennylaneSupplier');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
