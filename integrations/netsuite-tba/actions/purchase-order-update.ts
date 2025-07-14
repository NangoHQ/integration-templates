import type { NangoAction, NetsuitePurchaseOrderUpdateInput, NetsuitePurchaseOrderUpdateOutput } from '../../models.js';
import type { NS_PurchaseOrder, NS_PurchaseOrderLine } from '../types.js';
import { netsuitePurchaseOrderUpdateInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: NetsuitePurchaseOrderUpdateInput): Promise<NetsuitePurchaseOrderUpdateOutput> {
    await nango.zodValidateInput({ zodSchema: netsuitePurchaseOrderUpdateInputSchema, input });

    const body: Partial<NS_PurchaseOrder> = {
        id: input.id
    };

    if (input.status) {
        body.status = { id: input.status };
    }

    if (input.lines) {
        const lines = input.lines.map((line) => {
            const poLine: NS_PurchaseOrderLine = {
                item: {
                    id: line.itemId,
                    refName: line.description || ''
                },
                quantity: line.quantity,
                amount: line.amount,
                rate: line.rate ?? 0
            };

            if (line.locationId) {
                poLine.location = { id: line.locationId, refName: '' };
            }

            if (line.department) {
                poLine.department = { id: line.department, refName: '' };
            }

            if (line.class) {
                poLine.class = { id: line.class, refName: '' };
            }

            return poLine;
        });

        body.item = { items: lines };
    }

    if (input.description) {
        body.memo = input.description;
    }

    if (input.location) {
        body.location = { id: input.location, refName: '' };
    }

    if (input.subsidiary) {
        body.subsidiary = { id: input.subsidiary, refName: '' };
    }

    if (input.department) {
        body.department = { id: input.department, refName: '' };
    }

    if (input.class) {
        body.class = { id: input.class, refName: '' };
    }

    if (input.billingAddress) {
        body.billAddress = {
            addr1: input.billingAddress.addr1 ?? '',
            addr2: input.billingAddress.addr2 ?? '',
            addr3: input.billingAddress.addr3 ?? '',
            city: input.billingAddress.city ?? '',
            state: input.billingAddress.state ?? '',
            zip: input.billingAddress.zip ?? '',
            country: input.billingAddress.country ? { id: input.billingAddress.country, refName: '' } : { id: '' }
        };
    }

    if (input.shippingAddress) {
        body.shipAddress = {
            addr1: input.shippingAddress.addr1 ?? '',
            addr2: input.shippingAddress.addr2 ?? '',
            addr3: input.shippingAddress.addr3 ?? '',
            city: input.shippingAddress.city ?? '',
            state: input.shippingAddress.state ?? '',
            zip: input.shippingAddress.zip ?? '',
            country: input.shippingAddress.country ? { id: input.shippingAddress.country, refName: '' } : { id: '', refName: '' }
        };
    }
    await nango.patch({
        endpoint: `/purchaseorder/${input.id}`,
        data: body,
        retries: 3
    });

    return { success: true };
}
