import type { NangoSync, Organisation, ProxyConfiguration } from '../../models';
import { getTenantId } from '../helpers/get-tenant-id.js';
import { parseDate } from '../utils.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const tenant_id = await getTenantId(nango);

    const config: ProxyConfiguration = {
        // https://developer.xero.com/documentation/api/accounting/organisation
        endpoint: 'api.xro/2.0/Organisation',
        headers: {
            'xero-tenant-id': tenant_id
        },
        retries: 10
    };

    const res = await nango.get(config);
    if (res.data.Organisations) {
        const mappedOrganisations = res.data.Organisations.map(mapXeroOrganisation);
        await nango.batchSave(mappedOrganisations, 'Organisation');
    }
}

function mapXeroOrganisation(xeroOrganisation: any): Organisation {
    return {
        id: xeroOrganisation.OrganisationID,
        apiKey: xeroOrganisation.APIKey,
        name: xeroOrganisation.Name,
        legalName: xeroOrganisation.LegalName,
        paysTax: xeroOrganisation.PaysTax,
        version: xeroOrganisation.Version,
        organisationType: xeroOrganisation.OrganisationType,
        baseCurrency: xeroOrganisation.BaseCurrency,
        countryCode: xeroOrganisation.CountryCode,
        isDemoCompany: xeroOrganisation.IsDemoCompany,
        organisationStatus: xeroOrganisation.OrganisationStatus,
        registrationNumber: xeroOrganisation.RegistrationNumber,
        employerIdentificationNumber: xeroOrganisation.EmployerIdentificationNumber,
        taxNumber: xeroOrganisation.TaxNumber,
        financialYearEndDay: xeroOrganisation.FinancialYearEndDay,
        financialYearEndMonth: xeroOrganisation.FinancialYearEndMonth,
        salesTaxBasis: xeroOrganisation.SalesTaxBasis,
        salesTaxPeriod: xeroOrganisation.SalesTaxPeriod,
        defaultSalesTax: xeroOrganisation.DefaultSalesTax,
        defaultPurchasesTax: xeroOrganisation.DefaultPurchasesTax,
        ...(xeroOrganisation.PeriodLockDate && { periodLockDate: parseDate(xeroOrganisation.PeriodLockDate).toISOString() }),
        ...(xeroOrganisation.EndOfYearLockDate && { endOfYearLockDate: parseDate(xeroOrganisation.EndOfYearLockDate).toISOString() }),
        ...(xeroOrganisation.CreatedDateUTC && { createdDateUTC: parseDate(xeroOrganisation.CreatedDateUTC).toISOString() }),
        timezone: xeroOrganisation.Timezone,
        organisationEntityType: xeroOrganisation.OrganisationEntityType,
        shortCode: xeroOrganisation.ShortCode,
        edition: xeroOrganisation.Edition,
        class: xeroOrganisation.Class,
        lineOfBusiness: xeroOrganisation.LineOfBusiness,
        addresses: xeroOrganisation.Addresses,
        phones: xeroOrganisation.Phones,
        externalLinks: xeroOrganisation.ExternalLinks,
        paymentTerms: xeroOrganisation.PaymentTerms
    };
}
