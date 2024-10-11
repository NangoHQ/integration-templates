import type { NangoSync, Deal, ProxyConfiguration, Company, Contact, Task } from '../../models';
import { toDeal } from '../mappers/toDeal.js';
import { toTask } from '../mappers/toTask.js';
import type { HubSpotDealNonUndefined, HubSpotTaskNonUndefined, HubSpotCompanyNonUndefined, HubSpotContactNonUndefined } from '../types';
import { toCompany } from '../mappers/toCompany.js';
import { toContact } from '../mappers/toContact.js';

const CACHE = {
    companies: new Map<string, Company>(),
    contacts: new Map<string, Contact>(),
    deals: new Map<string, Deal>()
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

async function fetchDealsById(nango: NangoSync, dealId: string) {
    if (CACHE.deals.has(dealId)) {
        return CACHE.deals.get(dealId);
    }

    const config: ProxyConfiguration = {
        endpoint: `/crm/v3/objects/deals/${dealId}`,
        retries: 10,
        params: {
            properties: 'id,dealname'
        }
    };
    const response = await nango.get<HubSpotDealNonUndefined>(config);
    const deal: Deal = toDeal(response.data, undefined, undefined);
    CACHE.deals.set(dealId, deal);
    return deal;
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
    const properties = ['hs_task_type', 'hs_task_subject', 'hs_task_priority', 'hubspot_owner_id', 'hs_timestamp', 'hs_task_body'];

    const config: ProxyConfiguration = {
        endpoint: '/crm/v3/objects/tasks',
        params: {
            properties: properties.join(','),
            associations: 'contact,company,deal'
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

    for await (const tasks of nango.paginate<HubSpotTaskNonUndefined>(config)) {
        const mappedTasks: Task[] = [];

        for (const task of tasks) {
            const companyIds = new Set<string>();
            const contactIds = new Set<string>();
            const dealIds = new Set<string>();

            if (task.associations && !Array.isArray(task.associations)) {
                if (task.associations.companies && task.associations.companies.results) {
                    for (const company of task.associations.companies.results) {
                        companyIds.add(company.id);
                    }
                }
                if (task.associations.contacts && task.associations.contacts.results) {
                    for (const contact of task.associations.contacts.results) {
                        contactIds.add(contact.id);
                    }
                }
                if (task.associations.deals && task.associations.deals.results) {
                    for (const deal of task.associations.deals.results) {
                        dealIds.add(deal.id);
                    }
                }
            }

            const companies: Company[] = [];
            const contacts: Contact[] = [];
            const deals: Deal[] = [];

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

            for (const dealId of dealIds) {
                const deal = await fetchDealsById(nango, dealId);
                if (deal) {
                    deals.push(deal);
                }
            }
            const mappedTask = toTask(
                task,
                contacts?.map((contact) => ({
                    id: contact.id,
                    first_name: contact.first_name,
                    last_name: contact.last_name
                })),
                companies?.map((company) => ({
                    id: company.id,
                    name: company.name
                })),
                deals?.map((deal) => ({
                    id: deal.id,
                    name: deal.name
                }))
            );

            mappedTasks.push(mappedTask);
        }

        await nango.batchSave<Task>(mappedTasks, 'Task');
    }
}
