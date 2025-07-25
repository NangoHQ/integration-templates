import type { Company, CreateUpdateCompanyOutput, CreateCompanyInput, UpdateCompanyInput } from '../../models.js';
import type { HubSpotCompany, HubSpotCompanyNonUndefined, HubSpotCompanyNonNull } from '../types.js';

export function toCompany(company: HubSpotCompanyNonUndefined): Company {
    return {
        id: company.id,
        created_date: company.createdAt,
        name: company.properties.name,
        industry: company.properties.industry,
        description: company.properties.description,
        country: company.properties.country,
        city: company.properties.city,
        lead_status: company.properties.hs_lead_status,
        lifecycle_stage: company.properties.lifecyclestage,
        owner: company.properties.hubspot_owner_id,
        year_founded: company.properties.founded_year,
        website_url: company.properties.website
    };
}

export function createUpdateCompany(company: HubSpotCompanyNonNull): CreateUpdateCompanyOutput {
    return {
        id: company.id,
        created_date: company.createdAt,
        name: company.properties.name,
        industry: company.properties.industry,
        description: company.properties.description,
        country: company.properties.country,
        city: company.properties.city,
        lead_status: company.properties.hs_lead_status,
        lifecycle_stage: company.properties.lifecyclestage,
        owner: company.properties.hubspot_owner_id,
        year_founded: company.properties.founded_year,
        website_url: company.properties.website
    };
}

export function toHubspotCompany(company: CreateCompanyInput | UpdateCompanyInput): Partial<HubSpotCompany> {
    const hubSpotCompany: Partial<HubSpotCompany> = {
        properties: {}
    };

    if (company.name) {
        hubSpotCompany.properties!.name = company.name;
    }

    if (company.industry) {
        hubSpotCompany.properties!.industry = company.industry;
    }

    if (company.description) {
        hubSpotCompany.properties!.description = company.description;
    }

    if (company.country) {
        hubSpotCompany.properties!.country = company.country;
    }

    if (company.city) {
        hubSpotCompany.properties!.city = company.city;
    }

    if (company.lead_status) {
        hubSpotCompany.properties!.hs_lead_status = company.lead_status;
    }

    if (company.lifecycle_stage) {
        hubSpotCompany.properties!.lifecyclestage = company.lifecycle_stage;
    }

    if (company.owner) {
        hubSpotCompany.properties!.hubspot_owner_id = company.owner;
    }

    if (company.year_founded) {
        hubSpotCompany.properties!.founded_year = company.year_founded;
    }

    if (company.website_url) {
        hubSpotCompany.properties!.website = company.website_url;
    }

    return hubSpotCompany;
}
