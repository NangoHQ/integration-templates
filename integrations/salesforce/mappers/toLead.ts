import type { Lead, CreateLeadInput, UpdateLeadInput } from '../../models';
import type { SalesforceLead } from '../types';

export function toLead(lead: SalesforceLead): Lead {
    return {
        id: lead.Id,
        first_name: lead.FirstName,
        middle_name: lead.MiddleName,
        last_name: lead.LastName,
        company_name: lead.Company,
        email: lead.Email,
        owner_id: lead.OwnerId,
        owner_name: lead.Owner.Name,
        phone: lead.Phone,
        salutation: lead.Salutation,
        title: lead.Title,
        website: lead.Website,
        industry: lead.Industry,
        last_modified_date: lead.LastModifiedDate
    };
}

export function toSalesForceLead(lead: CreateLeadInput | UpdateLeadInput): Partial<SalesforceLead> {
    const salesforcelead: Partial<SalesforceLead> = {};

    if (lead.first_name) {
        salesforcelead.FirstName = lead.first_name;
    }

    if (lead.middle_name) {
        salesforcelead.MiddleName = lead.middle_name;
    }

    if (lead.last_name) {
        salesforcelead.LastName = lead.last_name;
    }

    if (lead.company_name) {
        salesforcelead.Company = lead.company_name;
    }

    if (lead.email) {
        salesforcelead.Email = lead.email;
    }

    if (lead.owner_id) {
        salesforcelead.OwnerId = lead.owner_id;
    }

    if (lead.phone) {
        salesforcelead.Phone = lead.phone;
    }

    if (lead.salutation) {
        salesforcelead.Salutation = lead.salutation;
    }

    if (lead.title) {
        salesforcelead.Title = lead.title;
    }

    if (lead.website) {
        salesforcelead.Website = lead.website;
    }

    if (lead.industry) {
        salesforcelead.Industry = lead.industry;
    }

    return salesforcelead;
}
