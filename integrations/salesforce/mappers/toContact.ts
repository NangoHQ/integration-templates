import type { Contact, CreateContactInput, UpdateContactInput } from '../../models';
import type { SalesforceContact } from '../types';

export function toContact(contact: SalesforceContact): Contact {
    return {
        id: contact.Id,
        first_name: contact.FirstName,
        last_name: contact.LastName,
        account_name: contact.Account ? contact.Account.Name : null,
        account_id: contact.AccountId,
        email: contact.Email,
        owner_id: contact.OwnerId,
        owner_name: contact.Owner.Name,
        mobile: contact.MobilePhone,
        phone: contact.Phone,
        salutation: contact.Salutation,
        title: contact.Title,
        last_modified_date: contact.LastModifiedDate
    };
}

export function toSalesForceContact(contact: CreateContactInput | UpdateContactInput): Partial<SalesforceContact> {
    const salesforceContact: Partial<SalesforceContact> = {};

    if (contact.first_name) {
        salesforceContact.FirstName = contact.first_name;
    }

    if (contact.last_name) {
        salesforceContact.LastName = contact.last_name;
    }

    if (contact.account_id) {
        salesforceContact.AccountId = contact.account_id;
    }

    if (contact.owner_id) {
        salesforceContact.OwnerId = contact.owner_id;
    }

    if (contact.email) {
        salesforceContact.Email = contact.email;
    }

    if (contact.mobile) {
        salesforceContact.MobilePhone = contact.mobile;
    }

    if (contact.phone) {
        salesforceContact.Phone = contact.phone;
    }

    if (contact.salutation) {
        salesforceContact.Salutation = contact.salutation;
    }

    if (contact.title) {
        salesforceContact.Title = contact.title;
    }

    return salesforceContact;
}
