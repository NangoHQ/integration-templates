import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    displayName: z.string().describe('The display name of the vendor. Example: "Acme Supplies"'),
    givenName: z.string().optional().describe('First name of the vendor contact.'),
    familyName: z.string().optional().describe('Last name of the vendor contact.'),
    companyName: z.string().optional().describe('Company name of the vendor.'),
    primaryEmail: z.string().optional().describe('Primary email address.'),
    primaryPhone: z.string().optional().describe('Primary phone number.'),
    mobile: z.string().optional().describe('Mobile phone number.'),
    fax: z.string().optional().describe('Fax number.'),
    webAddr: z.string().optional().describe('Website address.'),
    billAddr: z
        .object({
            line1: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            postalCode: z.string().optional(),
            lat: z.string().optional(),
            long: z.string().optional()
        })
        .optional()
        .describe('Billing address for the vendor.')
});

const ProviderVendorSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    DisplayName: z.string().optional(),
    GivenName: z.string().optional(),
    FamilyName: z.string().optional(),
    CompanyName: z.string().optional(),
    PrimaryEmailAddr: z
        .object({
            Address: z.string().optional()
        })
        .optional(),
    PrimaryPhone: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional(),
    Mobile: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional(),
    Fax: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional(),
    WebAddr: z
        .object({
            URI: z.string().optional()
        })
        .optional(),
    BillAddr: z
        .object({
            Line1: z.string().optional(),
            City: z.string().optional(),
            Country: z.string().optional(),
            PostalCode: z.string().optional(),
            Lat: z.string().optional(),
            Long: z.string().optional()
        })
        .optional(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    syncToken: z.string(),
    displayName: z.string().optional(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    companyName: z.string().optional(),
    primaryEmail: z.string().optional(),
    primaryPhone: z.string().optional(),
    mobile: z.string().optional(),
    fax: z.string().optional(),
    webAddr: z.string().optional(),
    billAddr: z
        .object({
            line1: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            postalCode: z.string().optional(),
            lat: z.string().optional(),
            long: z.string().optional()
        })
        .optional(),
    createdTime: z.string().optional(),
    lastUpdatedTime: z.string().optional()
});

async function getCompany(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return realmId;
}

const action = createAction({
    description: 'Create a vendor record in QuickBooks Online.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        const payload: Record<string, unknown> = {
            DisplayName: input.displayName
        };

        if (input.givenName !== undefined) {
            payload['GivenName'] = input.givenName;
        }
        if (input.familyName !== undefined) {
            payload['FamilyName'] = input.familyName;
        }
        if (input.companyName !== undefined) {
            payload['CompanyName'] = input.companyName;
        }
        if (input.primaryEmail !== undefined) {
            payload['PrimaryEmailAddr'] = { Address: input.primaryEmail };
        }
        if (input.primaryPhone !== undefined) {
            payload['PrimaryPhone'] = { FreeFormNumber: input.primaryPhone };
        }
        if (input.mobile !== undefined) {
            payload['Mobile'] = { FreeFormNumber: input.mobile };
        }
        if (input.fax !== undefined) {
            payload['Fax'] = { FreeFormNumber: input.fax };
        }
        if (input.webAddr !== undefined) {
            payload['WebAddr'] = { URI: input.webAddr };
        }
        if (input.billAddr !== undefined) {
            payload['BillAddr'] = {
                ...(input.billAddr.line1 !== undefined && { Line1: input.billAddr.line1 }),
                ...(input.billAddr.city !== undefined && { City: input.billAddr.city }),
                ...(input.billAddr.country !== undefined && { Country: input.billAddr.country }),
                ...(input.billAddr.postalCode !== undefined && { PostalCode: input.billAddr.postalCode }),
                ...(input.billAddr.lat !== undefined && { Lat: input.billAddr.lat }),
                ...(input.billAddr.long !== undefined && { Long: input.billAddr.long })
            };
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/vendor`,
            data: payload,
            retries: 3
        });

        const responseData = response.data;
        if (!responseData) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Failed to create vendor'
            });
        }

        // QuickBooks API wraps the response in an object with the entity name
        const vendorData =
            typeof responseData === 'object' &&
            responseData !== null &&
            'Vendor' in responseData &&
            responseData.Vendor !== null &&
            typeof responseData.Vendor === 'object'
                ? responseData.Vendor
                : responseData;

        const vendor = ProviderVendorSchema.parse(vendorData);

        return {
            id: vendor.Id,
            syncToken: vendor.SyncToken,
            ...(vendor.DisplayName !== undefined && { displayName: vendor.DisplayName }),
            ...(vendor.GivenName !== undefined && { givenName: vendor.GivenName }),
            ...(vendor.FamilyName !== undefined && { familyName: vendor.FamilyName }),
            ...(vendor.CompanyName !== undefined && { companyName: vendor.CompanyName }),
            ...(vendor.PrimaryEmailAddr?.Address !== undefined && {
                primaryEmail: vendor.PrimaryEmailAddr.Address
            }),
            ...(vendor.PrimaryPhone?.FreeFormNumber !== undefined && {
                primaryPhone: vendor.PrimaryPhone.FreeFormNumber
            }),
            ...(vendor.Mobile?.FreeFormNumber !== undefined && { mobile: vendor.Mobile.FreeFormNumber }),
            ...(vendor.Fax?.FreeFormNumber !== undefined && { fax: vendor.Fax.FreeFormNumber }),
            ...(vendor.WebAddr?.URI !== undefined && { webAddr: vendor.WebAddr.URI }),
            ...(vendor.BillAddr !== undefined && {
                billAddr: {
                    ...(vendor.BillAddr.Line1 !== undefined && { line1: vendor.BillAddr.Line1 }),
                    ...(vendor.BillAddr.City !== undefined && { city: vendor.BillAddr.City }),
                    ...(vendor.BillAddr.Country !== undefined && { country: vendor.BillAddr.Country }),
                    ...(vendor.BillAddr.PostalCode !== undefined && {
                        postalCode: vendor.BillAddr.PostalCode
                    }),
                    ...(vendor.BillAddr.Lat !== undefined && { lat: vendor.BillAddr.Lat }),
                    ...(vendor.BillAddr.Long !== undefined && { long: vendor.BillAddr.Long })
                }
            }),
            ...(vendor.MetaData?.CreateTime !== undefined && { createdTime: vendor.MetaData.CreateTime }),
            ...(vendor.MetaData?.LastUpdatedTime !== undefined && {
                lastUpdatedTime: vendor.MetaData.LastUpdatedTime
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
