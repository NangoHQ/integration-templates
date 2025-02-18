import type { Bill, BillLine, CreateBill } from '../../models';
import type { CreateQuickBooksBill, QuickBooksBill, QuickBooksBillLine, ReferenceType } from '../types';

/**
 * Converts a QuickBooksBill object to internal Bill format.
 * Only includes fields that have values, avoiding undefined assignments.
 *
 * @param bill The QuickBooksBill object to convert
 * @returns Bill object representing internal bill information
 */
export function toBill(bill: QuickBooksBill): Bill {
    // Required fields that must always be present
    const baseBill: Bill = {
        id: bill.Id,
        created_at: new Date(bill.MetaData.CreateTime).toISOString(),
        updated_at: new Date(bill.MetaData.LastUpdatedTime).toISOString(),
        due_date: new Date(bill.DueDate).toISOString(),
        balance: bill.Balance,
        txn_date: new Date(bill.TxnDate).toISOString(),
        currency: bill.CurrencyRef.value,
        vendor_id: bill.VendorRef.value,
        total_amount: bill.TotalAmt,
        lines: mapBillLines(bill.Line)
    };

    // Optional fields - only include if they have values
    const optionalFields: Partial<Bill> = {};

    const salesTermId = getReferenceValue(bill.SalesTermRef);
    if (salesTermId) {
        optionalFields.sales_term_id = salesTermId;
    }
    const vendorName = getReferenceName(bill.VendorRef);
    if (vendorName) {
        optionalFields.vendor_name = vendorName;
    }

    if (bill.APAccountRef) {
        const apAccountId = getReferenceValue(bill.APAccountRef);
        if (apAccountId) {
            optionalFields.ap_account_id = apAccountId;
        }

        const apAccountName = getReferenceName(bill.APAccountRef);
        if (apAccountName) {
            optionalFields.ap_account_name = apAccountName;
        }
    }

    return {
        ...baseBill,
        ...optionalFields
    };
}

/**
 * Converts an internal Bill object to QuickBooks format
 * Use Default value required by QuickBooks for fields that are not present in the internal Bill object
 *
 * @param bill The internal Bill object to convert
 * @returns QuickBooksBill object
 */
export function toQuickBooksBill(bill: Bill): QuickBooksBill {
    // Required fields
    const qbBill: QuickBooksBill = {
        Id: bill.id,
        MetaData: {
            CreateTime: new Date(bill.created_at).toISOString(),
            LastUpdatedTime: new Date(bill.updated_at).toISOString()
        },
        VendorRef: {
            value: bill.vendor_id,
            ...(bill.vendor_name && { name: bill.vendor_name })
        },
        DueDate: new Date(bill.due_date).toISOString(),
        TxnDate: new Date(bill.txn_date).toISOString(),
        CurrencyRef: {
            value: bill.currency
        },
        Balance: bill.balance,
        TotalAmt: bill.total_amount,
        Line: bill.lines.map((line) => ({
            Id: line.id,
            DetailType: line.detail_type,
            Amount: line.amount,
            Description: '',
            ...(line.account_id && {
                AccountBasedExpenseLineDetail: {
                    AccountRef: {
                        value: line.account_id,
                        ...(line.account_name && { name: line.account_name })
                    },
                    BillableStatus: 'NotBillable',
                    TaxCodeRef: {
                        value: 'NON'
                    }
                }
            })
        })),
        domain: 'QBO',
        sparse: false,
        SyncToken: '0',
        SalesTermRef: {
            value: bill.sales_term_id || '1'
        }
    };

    if (bill.ap_account_id) {
        qbBill.APAccountRef = {
            value: bill.ap_account_id,
            ...(bill.ap_account_name && { name: bill.ap_account_name })
        };
    }

    return qbBill;
}

export function toCreateQuickBooksBill(bill: CreateBill): CreateQuickBooksBill {
    const createBill: CreateQuickBooksBill = {
        VendorRef: {
            value: bill.vendor_id,
            ...(bill.vendor_name && { name: bill.vendor_name })
        },
        CurrencyRef: {
            value: bill.currency
        },
        Line: bill.line.map((line) => ({
            Id: line.id ?? 0,
            DetailType: line.detail_type,
            Amount: line.amount,
            ...(line.account_id && {
                AccountBasedExpenseLineDetail: {
                    AccountRef: {
                        value: line.account_id,
                        ...(line.account_name && { name: line.account_name })
                    }
                }
            })
        }))
    };
    return createBill;
}

/**
 * Maps QuickBooks bill lines to internal format
 */
function mapBillLines(lines: QuickBooksBillLine[]): BillLine[] {
    return lines.map((line) => {
        const baseLine: BillLine = {
            id: line.Id,
            detail_type: line.DetailType,
            amount: line.Amount
        };

        if (line.AccountBasedExpenseLineDetail?.AccountRef) {
            const accountRef = line.AccountBasedExpenseLineDetail.AccountRef;
            if (accountRef.value) {
                baseLine.account_id = accountRef.value;
            }
            if (accountRef.name) {
                baseLine.account_name = accountRef.name;
            }
        }

        return baseLine;
    });
}

/**
 * Extracts value from a ReferenceType object
 */
function getReferenceValue(ref: ReferenceType | undefined): string | undefined {
    return ref?.value;
}

/**
 * Extracts name from a ReferenceType object
 */
function getReferenceName(ref: ReferenceType | undefined): string | undefined {
    return ref?.name;
}
