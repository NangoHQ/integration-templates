import type { NangoAction, NetsuiteBillCreateInput, NetsuiteBillCreateOutput } from '../../models';
import type { NS_VendorBill, NS_VendorBillLine } from '../types';
import { netsuiteBillCreateInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: NetsuiteBillCreateInput): Promise<NetsuiteBillCreateOutput> {
    const parsedInput = netsuiteBillCreateInputSchema.safeParse(input);
    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'invalid bill input',
            errors: parsedInput.error
        });
    }

    const lines = input.lines.map((line) => {
        const billLine: NS_VendorBillLine = {
            item: {
                id: line.itemId,
                refName: line.description ?? ''
            },
            quantity: line.quantity,
            amount: line.amount!,
            description: line.description ?? '',
            line: 0 // Line numbers are assigned by NetSuite
        };

        if (line.rate !== undefined) {
            billLine.rate = line.rate;
        }

        if (line.locationId) {
            billLine.location = {
                id: line.locationId
            };
        }

        if (line.departmentId) {
            billLine.department = {
                id: line.departmentId
            };
        }

        if (line.classId) {
            billLine.class = {
                id: line.classId
            };
        }

        if (line.customerId) {
            billLine.customer = {
                id: line.customerId
            };
        }

        if (line.isBillable !== undefined) {
            billLine.isBillable = line.isBillable;
        }

        if (line.taxDetails) {
            billLine.taxDetailsReference = line.taxDetails.taxCode ?? '';
        }

        if (line.inventoryDetail) {
            billLine.inventoryDetail = {
                quantity: line.inventoryDetail.quantity ?? line.quantity,
                binNumber: line.inventoryDetail.binNumber
                    ? {
                          id: line.inventoryDetail.binNumber
                      }
                    : { id: '' },
                expirationDate: line.inventoryDetail.expirationDate ?? '',
                receiptInventoryNumber: line.inventoryDetail.serialNumber ?? ''
            };
        }

        return billLine;
    });

    const body: Partial<NS_VendorBill> = {
        entity: {
            id: input.vendorId
        },
        tranDate: input.tranDate,
        currency: {
            id: input.currency,
            refName: input.currency
        },
        item: {
            items: lines
        }
    };

    if (input.dueDate) {
        body.dueDate = input.dueDate;
    }

    if (input.status) {
        body.status = {
            id: input.status,
            refName: ''
        };
    }

    if (input.memo) {
        body.memo = input.memo;
    }

    if (input.externalId) {
        body.externalId = input.externalId;
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

    if (input.terms) {
        body.terms = {
            id: input.terms
        };
    }

    if (input.billingAddress) {
        const billAddr: Partial<NS_VendorBill['billingAddress']> = {};

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

        body.billingAddress = billAddr;
    }

    if (input.taxDetails) {
        body.taxDetails = {
            items: [
                {
                    taxCode: input.taxDetails.taxCode
                        ? {
                              id: input.taxDetails.taxCode
                          }
                        : { id: '' },
                    taxRate: input.taxDetails.taxRate ?? 0
                }
            ]
        };
    }

    const res = await nango.post({
        endpoint: '/vendorbill',
        data: body,
        retries: 10
    });

    const id = res.headers['location']?.split('/').pop();
    if (!id) {
        throw new nango.ActionError({
            message: "Error creating vendor bill: could not parse 'id' from Netsuite API response"
        });
    }

    return { id };
}
