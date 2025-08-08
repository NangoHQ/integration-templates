import type { UnanetCompany } from '../types.js';
import type { Company } from '../models.js';

export function toCompany(company: UnanetCompany): Company {
    return {
        id: company.CompanyId.toString(),
        name: company.Name,
        externalId: company.ExternalId,
        shortName: company.Acronym,
        description: company.Notes
    };
}
