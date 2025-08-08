import { createSync } from "nango";
import { getTenantId } from '../helpers/get-tenant-id.js';
import { parseDate } from '../utils.js';

import type { ProxyConfiguration } from "nango";
import type { Address, Phone } from "../models.js";
import { Organisation } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches organisation details in Xero.",
    version: "2.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/organisations",
        group: "Organisations"
    }],

    scopes: ["accounting.settings", "accounting.settings.read"],

    models: {
        Organisation: Organisation
    },

    metadata: z.object({}),

    exec: async nango => {
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
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapXeroOrganisation(xeroOrganisation: any): Organisation {
    return {
        id: xeroOrganisation.OrganisationID,
        ...(xeroOrganisation.APIKey && { apiKey: xeroOrganisation.APIKey }),
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
        addresses: xeroOrganisation.Addresses?.map(mapXeroAddress),
        phones: xeroOrganisation.Phones?.map(mapXeroPhone),
        externalLinks: xeroOrganisation.ExternalLinks,
        paymentTerms: xeroOrganisation.PaymentTerms
    };
}

function mapXeroAddress(xeroAddress: any): Address {
    return {
        addressType: xeroAddress.AddressType,
        addressLine1: xeroAddress.AddressLine1,
        addressLine2: xeroAddress.AddressLine2,
        addressLine3: xeroAddress.AddressLine3,
        addressLine4: xeroAddress.AddressLine4,
        city: xeroAddress.City,
        region: xeroAddress.Region,
        postalCode: xeroAddress.PostalCode,
        country: xeroAddress.Country,
        attentionTo: xeroAddress.AttentionTo
    };
}
function mapXeroPhone(xeroPhone: any): Phone {
    return {
        phoneType: xeroPhone.PhoneType,
        phoneNumber: xeroPhone.PhoneNumber,
        phoneAreaCode: xeroPhone.PhoneAreaCode,
        phoneCountryCode: xeroPhone.PhoneCountryCode
    };
}
