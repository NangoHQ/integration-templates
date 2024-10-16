import type { NangoSync, Deal, ProxyConfiguration, Company, Contact, AssociationCompany, AssociationContact } from '../../models';
import { toDeal } from '../mappers/toDeal.js';
import type { HubSpotDealNonUndefined, HubSpotCompanyNonUndefined, HubSpotContactNonUndefined } from '../types';
import { toCompany } from '../mappers/toCompany.js';
import { toContact } from '../mappers/toContact.js';

const CACHE = {
    companies: new Map<string, Company>(),
    contacts: new Map<string, Contact>()
};

async function fetchCompanyById(nango: NangoSync, companyId: string) {
    if (CACHE.companies.has(companyId)) {
        return CACHE.companies.get(companyId);
    }

    const config: ProxyConfiguration = {
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

async function fetchContactById(nango: NangoSync, contactId: string) {
    if (CACHE.contacts.has(contactId)) {
        return CACHE.contacts.get(contactId);
    }

    const config: ProxyConfiguration = {
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

export default async function fetchData(nango: NangoSync): Promise<void> {
    const properties = ['dealname', 'amount', 'closedate', 'description', 'hubspot_owner_id', 'dealstage', 'hs_deal_stage_probability'];

    const config: ProxyConfiguration = {
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

        await nango.batchSave<Deal>(mappedDeals, 'Deal');
    }
}
