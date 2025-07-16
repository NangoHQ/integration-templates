import type { FailedCreditNote, CreditNote, CreditNoteFee } from ../models.js;
import type { CreditNote as XeroCreditNote } from '../types.js';
import { parseDate } from '../utils.js';

export function toCreditNote(xeroCreditNote: XeroCreditNote): CreditNote {
    const creditNote: CreditNote = {
        id: xeroCreditNote.CreditNoteID,
        type: xeroCreditNote.Type,
        external_contact_id: xeroCreditNote.Contact.ContactID,
        status: xeroCreditNote.Status,
        number: xeroCreditNote.CreditNoteNumber,
        currency: xeroCreditNote.CurrencyCode,
        reference: xeroCreditNote.Reference,
        issuing_date: xeroCreditNote.Date ? parseDate(xeroCreditNote.Date).toISOString() : null,
        fees: xeroCreditNote.LineItems.map(toCreditNoteItem)
    };

    return creditNote;
}

function toCreditNoteItem(xeroCreditNoteItem: any): CreditNoteFee {
    const creditNoteItem: CreditNoteFee = {
        item_id: xeroCreditNoteItem.LineItemID,
        item_code: xeroCreditNoteItem.ItemCode !== undefined ? xeroCreditNoteItem.ItemCode : null,
        description: xeroCreditNoteItem.Description !== undefined ? xeroCreditNoteItem.Description : null,
        units: xeroCreditNoteItem.Quantity !== undefined ? xeroCreditNoteItem.Quantity : null,
        precise_unit_amount: xeroCreditNoteItem.UnitAmount !== undefined ? xeroCreditNoteItem.UnitAmount : null,
        account_code: xeroCreditNoteItem.AccountCode !== undefined ? xeroCreditNoteItem.AccountCode : null,
        account_external_id: xeroCreditNoteItem.AccountId !== undefined ? xeroCreditNoteItem.AccountId : null,
        amount_cents: xeroCreditNoteItem.LineAmount !== undefined ? parseFloat(xeroCreditNoteItem.LineAmount) * 100 : null, // Amounts in xero are not in cents
        taxes_amount_cents: xeroCreditNoteItem.TaxAmount !== undefined ? parseFloat(xeroCreditNoteItem.TaxAmount) * 100 : null // Amounts in xero are not in cents
    };

    return creditNoteItem;
}

export function toFailedCreditNote(xeroCreditNote: XeroCreditNote): FailedCreditNote {
    const failedCreditNote = toCreditNote(xeroCreditNote);
    const failedCreditNoteWithValidationErrors: FailedCreditNote = {
        ...failedCreditNote,
        validation_errors: xeroCreditNote?.ValidationErrors || []
    };
    return failedCreditNoteWithValidationErrors;
}
