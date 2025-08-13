import type { ProxyConfiguration, NangoAction, NangoSync } from 'nango';
import type { ConnectionMetadata } from '../models.js';
import { connectionMetadataSchema } from '../schema.zod.js';
import type { AvalaraCompany } from '../types.js';

export async function getCompany(nango: NangoAction | NangoSync) {
    const rawResponse = await nango.getMetadata();
    const rawResponseParseResult = connectionMetadataSchema.safeParse(rawResponse);
    if (!rawResponseParseResult.success) {
        const companies = await fetchCompaniesFromAvalara(nango);
        const defaultCompany = companies.find((company: AvalaraCompany) => company.companyCode === 'DEFAULT');

        if (!defaultCompany) {
            throw new nango.ActionError({
                message: 'No default company found',
                errors: rawResponseParseResult.error
            });
        }

        return defaultCompany.companyCode;
    }
    const parsedData: ConnectionMetadata = rawResponseParseResult.data;

    return parsedData.company;
}

async function fetchCompaniesFromAvalara(nango: NangoAction | NangoSync): Promise<AvalaraCompany[]> {
    const config: ProxyConfiguration = {
        // https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Companies/QueryCompanies/
        endpoint: '/companies',
        retries: 10
    };

    const response = await nango.get(config);

    if (!response.data || !response.data.value || response.data.value.length === 0) {
        throw new Error('No companies found');
    }

    return response.data.value;
}
