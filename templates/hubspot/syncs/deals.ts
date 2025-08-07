import { createSync } from "nango";
import { toDeal } from '../mappers/toDeal.js';
import type { HubSpotDealNonUndefined, HubSpotCompanyNonUndefined, HubSpotContactNonUndefined } from '../types.js';
import { toCompany } from '../mappers/toCompany.js';
import { toContact } from '../mappers/toContact.js';

import type { ProxyConfiguration } from "nango";
import type { Company, Contact, AssociationCompany, AssociationContact } from "../models.js";
import { Deal } from "../models.js";
import { z } from "zod";

const CACHE = {
    companies: new Map<string, Company>(),
    contacts: new Map<string, Contact>()
};

async function fetchCompanyById(nango: NangoSyncLocal, companyId: string) {
    if (CACHE.companies.has(companyId)) {
        return CACHE.companies.get(companyId);
    }

    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/beta-docs/reference/api/crm/objects/companies?uuid=ed36fa47-a71a-4b7f-a100-ff70ffd55d48#get-%2Fcrm%2Fv3%2Fobjects%2Fcompanies%2F%7Bcompanyid%7D
        endpoint: `/crm/v3/objects/companies/${companyId}`,
        retries: 10,
        params: {
            properties: 'id,name'
        }
    };
    const response = await nango.get<HubSpotCompanyNonUndefined>(config);
    const company: Company = toCompany(response.data);
    CACHE.companies.set(companyId, company);
    return company;
}

async function fetchContactById(nango: NangoSyncLocal, contactId: string) {
    if (CACHE.contacts.has(contactId)) {
        return CACHE.contacts.get(contactId);
    }

    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/beta-docs/reference/api/crm/objects/contacts#get-%2Fcrm%2Fv3%2Fobjects%2Fcontacts%2F%7Bcontactid%7D
        endpoint: `/crm/v3/objects/contacts/${contactId}`,
        retries: 10,
        params: {
            properties: 'id,firstname,lastname'
        }
    };
    const response = await nango.get<HubSpotContactNonUndefined>(config);
    const contact: Contact = toContact(response.data);
    CACHE.contacts.set(contactId, contact);
    return contact;
}

const sync = createSync({
    description: "Fetches a list of deals from Hubspot with their associated companies and contacts",
    version: "2.0.0",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/deals",
        group: "Deals"
    }],

    scopes: [
        "crm.objects.deals.read",
        "oauth",
        "e-commerce (standard scope)",
        "crm.objects.line_items.read (granular scope)"
    ],

    models: {
        Deal: Deal
    },

    metadata: z.object({}),

    exec: async nango => {
        const properties = ['dealname', 'amount', 'closedate', 'description', 'hubspot_owner_id', 'dealstage', 'hs_deal_stage_probability'];

        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/beta-docs/reference/api/crm/objects/deals#get-%2Fcrm%2Fv3%2Fobjects%2Fdeals
            endpoint: '/crm/v3/objects/deals',
            params: {
                properties: properties.join(','),
                associations: 'contact,company'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.next.after',
                limit_name_in_request: 'limit',
                cursor_name_in_request: 'after',
                response_path: 'results',
                limit: 100
            },
            retries: 10
        };

        for await (const deals of nango.paginate<HubSpotDealNonUndefined>(config)) {
            const mappedDeals: Deal[] = [];

            for (const deal of deals) {
                const companyIds = new Set<string>();
                const contactIds = new Set<string>();

                if (deal.associations && !Array.isArray(deal.associations)) {
                    if (deal.associations.companies && deal.associations.companies.results) {
                        for (const company of deal.associations.companies.results) {
                            companyIds.add(company.id);
                        }
                    }
                    if (deal.associations.contacts && deal.associations.contacts.results) {
                        for (const contact of deal.associations.contacts.results) {
                            contactIds.add(contact.id);
                        }
                    }
                }

                const companies: AssociationCompany[] = [];
                const contacts: AssociationContact[] = [];

                for (const companyId of companyIds) {
                    const company = await fetchCompanyById(nango, companyId);
                    if (company) {
                        companies.push(company);
                    }
                }

                for (const contactId of contactIds) {
                    const contact = await fetchContactById(nango, contactId);
                    if (contact) {
                        contacts.push(contact);
                    }
                }
                const mappedDeal = toDeal(
                    deal,
                    contacts?.map((contact) => ({
                        id: contact.id,
                        first_name: contact.first_name,
                        last_name: contact.last_name
                    })),
                    companies?.map((company) => ({
                        id: company.id,
                        name: company.name
                    }))
                );

                mappedDeals.push(mappedDeal);
            }

            await nango.batchSave(mappedDeals, 'Deal');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
