import { createSync } from "nango";
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toCreditNote } from '../mappers/to-credit-note.js';
import type { CreditNote as XeroCreditNote } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { CreditNote } from "../models.js";
import { z } from "zod";

interface Config extends ProxyConfiguration {
    params: Record<string, string | number>;
}

const sync = createSync({
    description: "Fetches all credit notes in Xero. Incremental sync.",
    version: "2.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/credit-notes",
        group: "Credit Notes"
    }],

    scopes: ["accounting.transactions"],

    models: {
        CreditNote: CreditNote
    },

    metadata: z.object({}),

    exec: async nango => {
        const tenant_id = await getTenantId(nango);

        const config: Config = {
            endpoint: 'api.xro/2.0/CreditNotes',
            headers: {
                'xero-tenant-id': tenant_id,
                'If-Modified-Since': ''
            },
            params: {
                includeArchived: 'false'
            },
            retries: 10,
            paginate: {
                type: 'offset',
                response_path: 'CreditNotes',
                limit: 100,
                offset_name_in_request: 'page',
                offset_start_value: 1,
                limit_name_in_request: 'pageSize',
                offset_calculation_method: 'per-page'
            }
        };

        await nango.log(`Last sync date - type: ${typeof nango.lastSyncDate} JSON value: ${JSON.stringify(nango.lastSyncDate)}`);

        if (nango.lastSyncDate && config.params && config.headers) {
            config.params['includeArchived'] = 'true';
            config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
        }

        for await (const creditNotes of nango.paginate(config)) {
            // display the contacts of each credit note
            const activeCreditNotes = creditNotes.filter((x: any) => x.Status !== 'DELETED' && x.Status !== 'VOIDED');
            const mappedActiveCreditNotes = activeCreditNotes.map(toCreditNote);
            await nango.batchSave(mappedActiveCreditNotes, 'CreditNote');

            if (nango.lastSyncDate) {
                const archivedCreditNotes = creditNotes.filter((x: XeroCreditNote) => x.Status === 'DELETED' || x.Status === 'VOIDED');
                const mappedArchivedCreditNotes = archivedCreditNotes.map(toCreditNote);
                await nango.batchDelete(mappedArchivedCreditNotes, 'CreditNote');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
