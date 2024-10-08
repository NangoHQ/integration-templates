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
        item_code: xeroCreditNoteItem.ItemCode,
        description: xeroCreditNoteItem.Description,
        units: xeroCreditNoteItem.Quantity,
        precise_unit_amount: xeroCreditNoteItem.UnitAmount,
        account_code: xeroCreditNoteItem.AccountCode,
        account_external_id: xeroCreditNoteItem.AccountId,
        amount_cents: parseFloat(xeroCreditNoteItem.LineAmount) * 100, // Amounts in xero are not in cents
        taxes_amount_cents: parseFloat(xeroCreditNoteItem.TaxAmount) * 100 // Amounts in xero are not in cents
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
