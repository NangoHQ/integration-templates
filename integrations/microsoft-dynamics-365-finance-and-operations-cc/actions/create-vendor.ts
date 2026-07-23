import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    vendor_organization_name: z.string().describe('Vendor organization name. Example: "Acme Construction"'),
    vendor_group_id: z.string().describe('Vendor group ID. Example: "Construct"'),
    data_area_id: z.string().describe('Company / data area ID. Example: "dat"'),
    vendor_account_number: z.string().optional().describe('Optional vendor account number. If omitted, the system auto-generates one.'),
    address_city: z.string().optional().describe('City of the vendor address.'),
    address_street: z.string().optional().describe('Street of the vendor address.'),
    address_state_id: z.string().optional().describe('State of the vendor address.'),
    address_zip_code: z.string().optional().describe('ZIP / postal code of the vendor address.'),
    address_country_region_id: z.string().optional().describe('Country/region of the vendor address.'),
    primary_email_address: z.string().optional().describe('Primary email address of the vendor.'),
    primary_phone_number: z.string().optional().describe('Primary phone number of the vendor.')
});

const ProviderVendorSchema = z.object({
    dataAreaId: z.string(),
    VendorAccountNumber: z.string(),
    VendorOrganizationName: z.string().nullish(),
    VendorGroupId: z.string().nullish(),
    AddressCity: z.string().nullish(),
    AddressStreet: z.string().nullish(),
    AddressStateId: z.string().nullish(),
    AddressZipCode: z.string().nullish(),
    AddressCountryRegionId: z.string().nullish(),
    PrimaryEmailAddress: z.string().nullish(),
    PrimaryPhoneNumber: z.string().nullish()
});

const OutputSchema = z.object({
    data_area_id: z.string(),
    vendor_account_number: z.string(),
    vendor_organization_name: z.string().optional(),
    vendor_group_id: z.string().optional(),
    address_city: z.string().optional(),
    address_street: z.string().optional(),
    address_state_id: z.string().optional(),
    address_zip_code: z.string().optional(),
    address_country_region_id: z.string().optional(),
    primary_email_address: z.string().optional(),
    primary_phone_number: z.string().optional()
});

const action = createAction({
    description: 'Create a vendor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['FinancialsDataAccess'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            dataAreaId: input.data_area_id,
            VendorOrganizationName: input.vendor_organization_name,
            VendorGroupId: input.vendor_group_id
        };

        if (input.vendor_account_number !== undefined) {
            payload['VendorAccountNumber'] = input.vendor_account_number;
        }
        if (input.address_city !== undefined) {
            payload['AddressCity'] = input.address_city;
        }
        if (input.address_street !== undefined) {
            payload['AddressStreet'] = input.address_street;
        }
        if (input.address_state_id !== undefined) {
            payload['AddressStateId'] = input.address_state_id;
        }
        if (input.address_zip_code !== undefined) {
            payload['AddressZipCode'] = input.address_zip_code;
        }
        if (input.address_country_region_id !== undefined) {
            payload['AddressCountryRegionId'] = input.address_country_region_id;
        }
        if (input.primary_email_address !== undefined) {
            payload['PrimaryEmailAddress'] = input.primary_email_address;
        }
        if (input.primary_phone_number !== undefined) {
            payload['PrimaryPhoneNumber'] = input.primary_phone_number;
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.post({
            endpoint: '/data/VendorsV2',
            data: payload,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from provider: missing vendor data.'
            });
        }

        const providerData = ProviderVendorSchema.parse(response.data);

        return {
            data_area_id: providerData.dataAreaId,
            vendor_account_number: providerData.VendorAccountNumber,
            ...(providerData.VendorOrganizationName != null && { vendor_organization_name: providerData.VendorOrganizationName }),
            ...(providerData.VendorGroupId != null && { vendor_group_id: providerData.VendorGroupId }),
            ...(providerData.AddressCity != null && { address_city: providerData.AddressCity }),
            ...(providerData.AddressStreet != null && { address_street: providerData.AddressStreet }),
            ...(providerData.AddressStateId != null && { address_state_id: providerData.AddressStateId }),
            ...(providerData.AddressZipCode != null && { address_zip_code: providerData.AddressZipCode }),
            ...(providerData.AddressCountryRegionId != null && { address_country_region_id: providerData.AddressCountryRegionId }),
            ...(providerData.PrimaryEmailAddress != null && { primary_email_address: providerData.PrimaryEmailAddress }),
            ...(providerData.PrimaryPhoneNumber != null && { primary_phone_number: providerData.PrimaryPhoneNumber })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
