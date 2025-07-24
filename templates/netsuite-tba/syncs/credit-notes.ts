import { createSync } from "nango";
import type { NS_CreditNote, NSAPI_GetResponse } from '../types.js';
import { paginate } from '../helpers/pagination.js';
import { formatDate } from '../helpers/utils.js';

import type { ProxyConfiguration } from "nango";
import type { NetsuiteCreditNoteLine} from "../models.js";
import { NetsuiteCreditNote, NetsuiteMetadata } from "../models.js";

const retries = 3;

const sync = createSync({
    description: "Fetches all credit notes in Netsuite",
    version: "1.0.3",
    frequency: "every hour",
    autoStart: false,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/credit-notes",
        group: "Credit Notes"
    }],

    models: {
        NetsuiteCreditNote: NetsuiteCreditNote
    },

    metadata: NetsuiteMetadata,

    exec: async nango => {
        const lastModifiedDateQuery = nango.lastSyncDate ? `lastModifiedDate ON_OR_AFTER "${await formatDate(nango.lastSyncDate, nango)}"` : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://system.netsuite.com/help/helpcenter/en_US/APIs/REST_API_Browser/record/v1/2022.1/index.html#tag-creditMemo
            endpoint: '/creditmemo',
            retries,
            ...(lastModifiedDateQuery ? { params: { q: lastModifiedDateQuery } } : {})
        };
        for await (const creditNotes of paginate<{ id: string }>({ nango, proxyConfig })) {
            await nango.log('Listed credit notes', { total: creditNotes.length });

            const mappedCreditNotes: NetsuiteCreditNote[] = [];
            for (const creditNoteLink of creditNotes) {
                const creditNote: NSAPI_GetResponse<NS_CreditNote> = await nango.get({
                    endpoint: `/creditmemo/${creditNoteLink.id}`,
                    params: {
                        expandSubResources: 'true'
                    },
                    retries
                });
                if (!creditNote.data) {
                    await nango.log('Credit Note not found', { id: creditNoteLink.id });
                    continue;
                }
                const mappedCreditNote: NetsuiteCreditNote = {
                    id: creditNote.data.id,
                    customerId: creditNote.data.entity?.id || '',
                    currency: creditNote.data.currency?.refName || '',
                    description: creditNote.data.memo || null,
                    createdAt: creditNote.data.tranDate || '',
                    lines: [],
                    total: creditNote.data.total ? Number(creditNote.data.total) : 0,
                    status: creditNote.data.status?.refName || ''
                };

                for (const item of creditNote.data.item.items) {
                    const mappedCreditNoteLine: NetsuiteCreditNoteLine = {
                        itemId: item.item?.id || '',
                        quantity: item.quantity ? Number(item.quantity) : 0,
                        amount: item.amount ? Number(item.amount) : 0
                    };
                    if (item.taxDetailsReference) {
                        mappedCreditNoteLine.vatCode = item.taxDetailsReference;
                    }
                    if (item.item?.refName) {
                        mappedCreditNoteLine.description = item.item?.refName;
                    }
                    mappedCreditNote.lines.push(mappedCreditNoteLine);
                }

                mappedCreditNotes.push(mappedCreditNote);
            }

            await nango.batchSave(mappedCreditNotes, 'NetsuiteCreditNote');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
