import type { NangoAction, NetsuitePurchaseOrderCreateInput, NetsuitePurchaseOrderCreateOutput } from '../../models';
import type { NS_PurchaseOrder, NS_PurchaseOrderLine } from '../types';
import { netsuitePurchaseOrderCreateInputSchema } from '../schema.zod.js';
import { validateAndConvertDate } from '../helpers/validateDates.js';

export default async function runAction(nango: NangoAction, input: NetsuitePurchaseOrderCreateInput): Promise<NetsuitePurchaseOrderCreateOutput> {
    nango.zodValidate({ zodSchema: netsuitePurchaseOrderCreateInputSchema, input });

        if (line.rate !== undefined) {
            poLine.rate = line.rate;
        }

        if (line.locationId) {
            poLine.location = {
                id: line.locationId,
                refName: ''
            };
        }

        if (line.department) {
            poLine.department = {
                id: line.department,
                refName: ''
            };
        }

        if (line.class) {
            poLine.class = {
                id: line.class,
                refName: ''
            };
        }

        if (line.createWorkOrder) {
            poLine.createOutsourcedWo = line.createWorkOrder;
        }

        if (line.inventoryDetail) {
            poLine.inventoryDetail = {
                customForm: undefined,
                quantity: line.inventoryDetail.quantity,
                unit: undefined,
                inventoryassignment: {
                    items: line.inventoryDetail.binNumber
                        ? [
                              {
                                  binNumber: {
                                      id: line.inventoryDetail.binNumber,
                                      refName: ''
                                  },
                                  expirationDate: validateAndConvertDate(nango, line.inventoryDetail.expirationDate) ?? '',
                                  quantity: line.inventoryDetail.quantity ?? 0,
                                  receiptInventoryNumber: line.inventoryDetail.serialNumber ?? '',
                                  toBinNumber: line.inventoryDetail.toBinNumber
                                      ? {
                                            id: line.inventoryDetail.toBinNumber,
                                            refName: ''
                                        }
                                      : { id: '', refName: '' }
                              }
                          ]
                        : []
                }
            };
        }

        return poLine;
    });

    const body: Partial<NS_PurchaseOrder> = {
        entity: {
            id: input.vendorId
        },
        status: {
            id: input.status
        },
        item: {
            items: lines
        }
    };

    if (input.currency) {
        body.currency = {
            id: input.currency
        };
    }

    if (input.description) {
        body.memo = input.description;
    }

    if (input.tranDate) {
        body.tranDate = validateAndConvertDate(nango, input.tranDate);
    }

    if (input.dueDate) {
        body.dueDate = validateAndConvertDate(nango, input.dueDate);
    }

    if (input.location) {
        body.location = {
            id: input.location
        };
    }

    if (input.subsidiary) {
        body.subsidiary = {
            id: input.subsidiary
        };
    }

    if (input.department) {
        body.department = {
            id: input.department
        };
    }

    if (input.class) {
        body.class = {
            id: input.class
        };
    }

    if (input.customForm) {
        body.customForm = {
            id: input.customForm
        };
    }

    if (input.billingAddress) {
        const billAddr: Partial<NS_PurchaseOrder['billAddress']> = {};

        if (input.billingAddress.addr1) billAddr.addr1 = input.billingAddress.addr1;
        if (input.billingAddress.addr2) billAddr.addr2 = input.billingAddress.addr2;
        if (input.billingAddress.addr3) billAddr.addr3 = input.billingAddress.addr3;
        if (input.billingAddress.city) billAddr.city = input.billingAddress.city;
        if (input.billingAddress.state) billAddr.state = input.billingAddress.state;
        if (input.billingAddress.zip) billAddr.zip = input.billingAddress.zip;
        if (input.billingAddress.country) {
            billAddr.country = {
                id: input.billingAddress.country
            };
        }

        body.billAddress = billAddr;
    }

    if (input.shippingAddress) {
        const shipAddr: Partial<NS_PurchaseOrder['shipAddress']> = {};

        if (input.shippingAddress.addr1) shipAddr.addr1 = input.shippingAddress.addr1;
        if (input.shippingAddress.addr2) shipAddr.addr2 = input.shippingAddress.addr2;
        if (input.shippingAddress.addr3) shipAddr.addr3 = input.shippingAddress.addr3;
        if (input.shippingAddress.city) shipAddr.city = input.shippingAddress.city;
        if (input.shippingAddress.state) shipAddr.state = input.shippingAddress.state;
        if (input.shippingAddress.zip) shipAddr.zip = input.shippingAddress.zip;
        if (input.shippingAddress.country) {
            shipAddr.country = {
                id: input.shippingAddress.country
            };
        }

        body.shipAddress = shipAddr;
    }

    if (input.taxDetails?.taxCode) {
        body.taxDetails = [
            {
                taxCode: input.taxDetails.taxCode
                    ? {
                          id: input.taxDetails.taxCode
                      }
                    : { id: '' },
                taxRate: input.taxDetails.taxRate ?? 0
            }
        ];
    }

    const res = await nango.post({
        endpoint: '/purchaseorder',
        data: body,
        retries: 10
    });

    const id = res.headers['location']?.split('/').pop();
    if (!id) {
        throw new nango.ActionError({
            message: "Error creating purchase order: could not parse 'id' from Netsuite API response"
        });
    }

    return { id };
}
