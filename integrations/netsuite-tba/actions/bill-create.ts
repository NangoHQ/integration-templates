import type { NangoAction, NetsuiteBillCreateInput, NetsuiteBillCreateOutput } from '../../models';
import type { NS_VendorBill, NS_VendorBillLine } from '../types';
import { netsuiteBillCreateInputSchema } from '../schema.zod';

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
                id: line.locationId,
                refName: ''
            };
        }

        if (line.departmentId) {
            billLine.department = {
                id: line.departmentId,
                refName: ''
            };
        }

        if (line.classId) {
            billLine.class = {
                id: line.classId,
                refName: ''
            };
        }

        if (line.customerId) {
            billLine.customer = {
                id: line.customerId,
                refName: ''
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
                          // refName: ''
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
            id: input.vendorId,
            refName: ''
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
            id: input.location,
            refName: ''
        };
    }

    if (input.subsidiary) {
        body.subsidiary = {
            id: input.subsidiary,
            refName: ''
        };
    }

    if (input.department) {
        body.department = {
            id: input.department,
            refName: ''
        };
    }

    if (input.class) {
        body.class = {
            id: input.class,
            refName: ''
        };
    }

    if (input.terms) {
        body.terms = {
            id: input.terms,
            refName: ''
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
                id: input.billingAddress.country,
                refName: ''
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
                              id: input.taxDetails.taxCode,
                              refName: ''
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
