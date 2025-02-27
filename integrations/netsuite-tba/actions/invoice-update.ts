import type { NangoAction, NetsuiteInvoiceUpdateInput, NetsuiteInvoiceUpdateOutput } from '../../models';
import type { NS_Invoice, NS_Item } from '../types';
import { netsuiteInvoiceUpdateInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: NetsuiteInvoiceUpdateInput): Promise<NetsuiteInvoiceUpdateOutput> {
    nango.zodValidate({ zodSchema: netsuiteInvoiceUpdateInputSchema, input });
        if (line.vatCode) {
            item.taxDetailsReference = line.vatCode;
        }

        if (line.locationId) {
            item.location = { id: line.locationId, refName: '' };
        }
        return item;
    });

    const body: Partial<NS_Invoice> = {
        id: input.id
    };
    if (input.customerId) {
        body.entity = { id: input.customerId };
    }
    if (input.status) {
        body.status = { id: input.status };
    }
    if (input.currency) {
        body.currency = { refName: input.currency };
    }
    if (input.description) {
        body.memo = input.description;
    }

    if (lines) {
        body.item = { items: lines };
    }
    await nango.patch({
        endpoint: '/invoice',
        data: body,
        retries: 10
    });
    return { success: true };
}
