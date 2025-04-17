import type { FailedCreditNote, CreditNote, CreditNoteFee } from '../../models';
import type { CreditNote as XeroCreditNote } from '../types';
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
        item_code: xeroCreditNoteItem.ItemCode || null,
        description: xeroCreditNoteItem.Description || null,
        units: xeroCreditNoteItem.Quantity || null,
        precise_unit_amount: xeroCreditNoteItem.UnitAmount || null,
        account_code: xeroCreditNoteItem.AccountCode || null,
        account_external_id: xeroCreditNoteItem.AccountId || null,
        amount_cents: parseFloat(xeroCreditNoteItem.LineAmount) * 100 || null, // Amounts in xero are not in cents
        taxes_amount_cents: parseFloat(xeroCreditNoteItem.TaxAmount) * 100 || null // Amounts in xero are not in cents
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
