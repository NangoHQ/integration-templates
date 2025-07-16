import type { Account, CreateAccountInput, UpdateAccountInput } from ../models.js;
import type { SalesforceAccount } from '../types.js';

export function toAccount(account: SalesforceAccount): Account {
    return {
        id: account.Id,
        name: account.Name,
        description: account.Description,
        website: account.Website,
        industry: account.Industry,
        billing_city: account.BillingCity,
        billing_country: account.BillingCountry,
        owner_id: account.OwnerId,
        owner_name: account.Owner.Name,
        last_modified_date: account.LastModifiedDate
    };
}

export function toSalesForceAccount(account: CreateAccountInput | UpdateAccountInput): Partial<SalesforceAccount> {
    const salesforceAccount: Partial<SalesforceAccount> = {};

    if (account.name) {
        salesforceAccount.Name = account.name;
    }

    if (account.description) {
        salesforceAccount.Description = account.description;
    }

    if (account.website) {
        salesforceAccount.Website = account.website;
    }

    if (account.owner_id) {
        salesforceAccount.OwnerId = account.owner_id;
    }

    if (account.billing_city) {
        salesforceAccount.BillingCity = account.billing_city;
    }

    if (account.billing_country) {
        salesforceAccount.BillingCountry = account.billing_country;
    }

    return salesforceAccount;
}
