import { createSync } from 'nango';
import { z } from 'zod';

const ExternalLinkSchema = z
    .object({
        LinkType: z.string().optional().describe('Type of external link (e.g. Facebook, Twitter, LinkedIn).'),
        Url: z.string().optional().describe('URL for the external service.')
    })
    .describe('External service link associated with the organisation.');

const PhoneSchema = z
    .object({
        PhoneType: z.string().optional().describe('Type of phone number (e.g. OFFICE, MOBILE, FAX).'),
        PhoneNumber: z.string().optional().describe('Phone number without country or area code.'),
        PhoneAreaCode: z.string().optional().describe('Area code for the phone number.'),
        PhoneCountryCode: z.string().optional().describe('Country code for the phone number.')
    })
    .describe('Phone number associated with the organisation.');

const AddressSchema = z
    .object({
        AddressType: z.string().optional().describe('Type of address (e.g. POBOX, STREET).'),
        AddressLine1: z.string().optional().describe('First line of the address.'),
        AddressLine2: z.string().optional().describe('Second line of the address.'),
        AddressLine3: z.string().optional().describe('Third line of the address.'),
        AddressLine4: z.string().optional().describe('Fourth line of the address.'),
        City: z.string().optional().describe('City name.'),
        Region: z.string().optional().describe('State or region.'),
        PostalCode: z.string().optional().describe('Postal or ZIP code.'),
        Country: z.string().optional().describe('Country name.'),
        AttentionTo: z.string().optional().describe('Attention or contact name for the address.')
    })
    .describe('Address associated with the organisation.');

const PaymentTermDetailSchema = z
    .object({
        Day: z.number().optional().describe('Day of month or number of days for the payment term.'),
        Type: z.string().optional().describe('Type of payment term (e.g. DAYSAFTERBILLDATE, OFFOLLOWINGMONTH).')
    })
    .describe('Payment term details for bills or sales.');

const PaymentTermsSchema = z
    .object({
        Bills: PaymentTermDetailSchema.optional().describe('Default payment terms for bills (accounts payable).'),
        Sales: PaymentTermDetailSchema.optional().describe('Default payment terms for sales invoices (accounts receivable).')
    })
    .describe('Default payment terms configured for the organisation.');

const OrganisationSchema = z
    .object({
        id: z.string().describe('Unique identifier for the connected Xero tenant (tenantId from the Connections API).'),
        Name: z.string().describe('Display name of the Xero organisation.'),
        LegalName: z.string().optional().describe('Legal name of the organisation as registered.'),
        PaysTax: z.boolean().optional().describe('Whether the organisation is registered to pay tax.'),
        Version: z.string().optional().describe('Regional version of the Xero organisation (e.g. AU, NZ, UK, US).'),
        OrganisationType: z.string().optional().describe('Type of organisation (e.g. COMPANY, PARTNERSHIP, SOLETRADER).'),
        BaseCurrency: z.string().optional().describe('Base currency code for the organisation (e.g. AUD, USD).'),
        CountryCode: z.string().optional().describe('ISO country code of the organisation (e.g. AU, US).'),
        IsDemoCompany: z.boolean().optional().describe('Whether the organisation is a Xero demo company.'),
        OrganisationStatus: z.string().optional().describe('Current status of the organisation (e.g. ACTIVE).'),
        FinancialYearEndDay: z.number().optional().describe('Day of the month the financial year ends (1-31).'),
        FinancialYearEndMonth: z.number().optional().describe('Month the financial year ends (1-12).'),
        SalesTaxBasis: z.string().optional().describe('Tax basis used for sales tax reporting (e.g. ACCRUALS, CASH).'),
        SalesTaxPeriod: z.string().optional().describe('Reporting period for sales tax (e.g. MONTHLY, QUARTERLY1).'),
        DefaultSalesTax: z.string().optional().describe('Default tax setting for sales (e.g. Tax Exclusive).'),
        DefaultPurchasesTax: z.string().optional().describe('Default tax setting for purchases (e.g. Tax Inclusive).'),
        CreatedDateUTC: z.string().optional().describe('Date and time the organisation was created in UTC.'),
        OrganisationEntityType: z.string().optional().describe('Legal entity type of the organisation (e.g. COMPANY).'),
        Timezone: z.string().optional().describe('Timezone of the organisation (e.g. AUSEASTERNSTANDARDTIME).'),
        ShortCode: z.string().optional().describe('Short code identifier for the organisation.'),
        Edition: z.string().optional().describe('Xero edition (e.g. BUSINESS, PARTNER).'),
        Class: z.string().optional().describe('Xero subscription class (e.g. PREMIUM, STANDARD, DEMO).'),
        TenantId: z.string().describe('The Xero tenant ID used to make API requests for this organisation.'),
        Addresses: z.array(AddressSchema).optional().describe('Physical and postal addresses associated with the organisation.'),
        Phones: z.array(PhoneSchema).optional().describe('Phone numbers associated with the organisation.'),
        ExternalLinks: z.array(ExternalLinkSchema).optional().describe('External service links (e.g. social media) configured for the organisation.'),
        PaymentTerms: PaymentTermsSchema.optional().describe('Default payment terms for bills and sales invoices.')
    })
    .describe('Xero organisation record for a connected tenant.');

const ConnectionSchema = z.array(
    z.object({
        id: z.string(),
        tenantId: z.string(),
        tenantType: z.string().optional(),
        createdDateUtc: z.string().optional(),
        updatedDateUtc: z.string().optional()
    })
);

const OrganisationResponseSchema = z.object({
    Organisations: z.array(
        z.object({
            OrganisationID: z.string().optional(),
            Name: z.string().optional(),
            LegalName: z.string().optional(),
            PaysTax: z.boolean().optional(),
            Version: z.string().optional(),
            OrganisationType: z.string().optional(),
            BaseCurrency: z.string().optional(),
            CountryCode: z.string().optional(),
            IsDemoCompany: z.boolean().optional(),
            OrganisationStatus: z.string().optional(),
            FinancialYearEndDay: z.number().optional(),
            FinancialYearEndMonth: z.number().optional(),
            SalesTaxBasis: z.string().optional(),
            SalesTaxPeriod: z.string().optional(),
            DefaultSalesTax: z.string().optional(),
            DefaultPurchasesTax: z.string().optional(),
            CreatedDateUTC: z.string().optional(),
            OrganisationEntityType: z.string().optional(),
            Timezone: z.string().optional(),
            ShortCode: z.string().optional(),
            Edition: z.string().optional(),
            Class: z.string().optional(),
            Addresses: z.array(z.unknown()).optional(),
            Phones: z.array(z.unknown()).optional(),
            ExternalLinks: z.array(z.unknown()).optional(),
            PaymentTerms: z.record(z.string(), z.unknown()).optional()
        })
    )
});

const sync = createSync({
    description: 'Sync Xero organisation records for connected tenants.',
    version: '3.0.2',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Organisation: OrganisationSchema
    },

    exec: async (nango) => {
        // https://developer.xero.com/documentation/api/accounting/overview
        const connectionsResponse = await nango.get({
            // https://developer.xero.com/documentation/guides/oauth2/scopes/
            endpoint: 'connections',
            retries: 10
        });

        const connectionsResult = ConnectionSchema.safeParse(connectionsResponse.data);
        if (!connectionsResult.success) {
            throw new Error(`Failed to parse connections response: ${connectionsResult.error.message}`);
        }

        const connections = connectionsResult.data;
        const organisations: z.infer<typeof OrganisationSchema>[] = [];

        await nango.trackDeletesStart('Organisation');

        for (const connection of connections) {
            const tenantId = connection.tenantId;

            const orgResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/organisation
                endpoint: 'api.xro/2.0/Organisation',
                headers: {
                    'xero-tenant-id': tenantId
                },
                retries: 3
            });

            const orgResult = OrganisationResponseSchema.safeParse(orgResponse.data);
            if (!orgResult.success) {
                throw new Error(`Failed to parse Organisation response for tenant ${tenantId}: ${orgResult.error.message}`);
            }

            const orgs = orgResult.data.Organisations;
            const org = orgs[0];
            if (!org) {
                continue;
            }

            const mappedOrg: z.infer<typeof OrganisationSchema> = {
                id: tenantId,
                Name: org.Name ?? '',
                TenantId: tenantId
            };

            if (org.LegalName !== undefined) {
                mappedOrg.LegalName = org.LegalName;
            }
            if (org.PaysTax !== undefined) {
                mappedOrg.PaysTax = org.PaysTax;
            }
            if (org.Version !== undefined) {
                mappedOrg.Version = org.Version;
            }
            if (org.OrganisationType !== undefined) {
                mappedOrg.OrganisationType = org.OrganisationType;
            }
            if (org.BaseCurrency !== undefined) {
                mappedOrg.BaseCurrency = org.BaseCurrency;
            }
            if (org.CountryCode !== undefined) {
                mappedOrg.CountryCode = org.CountryCode;
            }
            if (org.IsDemoCompany !== undefined) {
                mappedOrg.IsDemoCompany = org.IsDemoCompany;
            }
            if (org.OrganisationStatus !== undefined) {
                mappedOrg.OrganisationStatus = org.OrganisationStatus;
            }
            if (org.FinancialYearEndDay !== undefined) {
                mappedOrg.FinancialYearEndDay = org.FinancialYearEndDay;
            }
            if (org.FinancialYearEndMonth !== undefined) {
                mappedOrg.FinancialYearEndMonth = org.FinancialYearEndMonth;
            }
            if (org.SalesTaxBasis !== undefined) {
                mappedOrg.SalesTaxBasis = org.SalesTaxBasis;
            }
            if (org.SalesTaxPeriod !== undefined) {
                mappedOrg.SalesTaxPeriod = org.SalesTaxPeriod;
            }
            if (org.DefaultSalesTax !== undefined) {
                mappedOrg.DefaultSalesTax = org.DefaultSalesTax;
            }
            if (org.DefaultPurchasesTax !== undefined) {
                mappedOrg.DefaultPurchasesTax = org.DefaultPurchasesTax;
            }
            if (org.CreatedDateUTC !== undefined) {
                mappedOrg.CreatedDateUTC = org.CreatedDateUTC;
            }
            if (org.OrganisationEntityType !== undefined) {
                mappedOrg.OrganisationEntityType = org.OrganisationEntityType;
            }
            if (org.Timezone !== undefined) {
                mappedOrg.Timezone = org.Timezone;
            }
            if (org.ShortCode !== undefined) {
                mappedOrg.ShortCode = org.ShortCode;
            }
            if (org.Edition !== undefined) {
                mappedOrg.Edition = org.Edition;
            }
            if (org.Class !== undefined) {
                mappedOrg.Class = org.Class;
            }
            if (org.Addresses !== undefined) {
                const addressesResult = z.array(AddressSchema).safeParse(org.Addresses);
                if (!addressesResult.success) {
                    throw new Error(`Failed to parse Addresses for tenant ${tenantId}: ${addressesResult.error.message}`);
                }
                mappedOrg.Addresses = addressesResult.data;
            }
            if (org.Phones !== undefined) {
                const phonesResult = z.array(PhoneSchema).safeParse(org.Phones);
                if (!phonesResult.success) {
                    throw new Error(`Failed to parse Phones for tenant ${tenantId}: ${phonesResult.error.message}`);
                }
                mappedOrg.Phones = phonesResult.data;
            }
            if (org.ExternalLinks !== undefined) {
                const linksResult = z.array(ExternalLinkSchema).safeParse(org.ExternalLinks);
                if (!linksResult.success) {
                    throw new Error(`Failed to parse ExternalLinks for tenant ${tenantId}: ${linksResult.error.message}`);
                }
                mappedOrg.ExternalLinks = linksResult.data;
            }
            if (org.PaymentTerms !== undefined) {
                const termsResult = PaymentTermsSchema.safeParse(org.PaymentTerms);
                if (!termsResult.success) {
                    throw new Error(`Failed to parse PaymentTerms for tenant ${tenantId}: ${termsResult.error.message}`);
                }
                mappedOrg.PaymentTerms = termsResult.data;
            }

            organisations.push(mappedOrg);
        }

        if (organisations.length > 0) {
            await nango.batchSave(organisations, 'Organisation');
        }

        await nango.trackDeletesEnd('Organisation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
