import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Id: z.string().describe('Unique identifier of the vendor. Example: "123"'),
    SyncToken: z.string().describe('Version number for optimistic locking. Example: "2"'),
    DisplayName: z.string().optional().describe('Display name of the vendor'),
    GivenName: z.string().optional().nullable().describe('First name of the vendor'),
    FamilyName: z.string().optional().nullable().describe('Last name of the vendor'),
    CompanyName: z.string().optional().nullable().describe('Company name of the vendor'),
    PrimaryEmailAddr: z
        .object({
            Address: z.string().optional().nullable()
        })
        .optional()
        .nullable()
        .describe('Primary email address'),
    PrimaryPhone: z
        .object({
            FreeFormNumber: z.string().optional().nullable()
        })
        .optional()
        .nullable()
        .describe('Primary phone number'),
    BillAddr: z
        .object({
            Line1: z.string().optional().nullable(),
            City: z.string().optional().nullable(),
            Country: z.string().optional().nullable(),
            PostalCode: z.string().optional().nullable()
        })
        .optional()
        .nullable()
        .describe('Billing address')
});

const VendorResponseSchema = z.object({
    Vendor: z.object({
        Id: z.string(),
        SyncToken: z.string(),
        DisplayName: z.string().optional(),
        GivenName: z.string().optional().nullable(),
        FamilyName: z.string().optional().nullable(),
        CompanyName: z.string().optional().nullable(),
        PrimaryEmailAddr: z
            .object({
                Address: z.string().optional().nullable()
            })
            .optional()
            .nullable(),
        PrimaryPhone: z
            .object({
                FreeFormNumber: z.string().optional().nullable()
            })
            .optional()
            .nullable(),
        BillAddr: z
            .object({
                Line1: z.string().optional().nullable(),
                City: z.string().optional().nullable(),
                Country: z.string().optional().nullable(),
                PostalCode: z.string().optional().nullable()
            })
            .optional()
            .nullable(),
        Active: z.boolean().optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    sync_token: z.string(),
    display_name: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    company_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z
        .object({
            line1: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            postal_code: z.string().optional()
        })
        .optional(),
    active: z.boolean().optional()
});

async function getRealmId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (typeof realmId !== 'string' || !realmId) {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return realmId;
}

const action = createAction({
    description: 'Update a vendor using its current SyncToken',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-vendor',
        group: 'Vendors'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        const requestBody: Record<string, unknown> = {
            Id: input.Id,
            SyncToken: input.SyncToken,
            sparse: true
        };

        if (input.DisplayName !== undefined) {
            requestBody['DisplayName'] = input.DisplayName;
        }
        if (input.GivenName !== undefined) {
            requestBody['GivenName'] = input.GivenName;
        }
        if (input.FamilyName !== undefined) {
            requestBody['FamilyName'] = input.FamilyName;
        }
        if (input.CompanyName !== undefined) {
            requestBody['CompanyName'] = input.CompanyName;
        }
        if (input.PrimaryEmailAddr !== undefined) {
            requestBody['PrimaryEmailAddr'] = input.PrimaryEmailAddr;
        }
        if (input.PrimaryPhone !== undefined) {
            requestBody['PrimaryPhone'] = input.PrimaryPhone;
        }
        if (input.BillAddr !== undefined) {
            requestBody['BillAddr'] = input.BillAddr;
        }

        const response = await nango.post({
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/vendor`,
            data: requestBody,
            retries: 3
        });

        const parsed = VendorResponseSchema.parse(response.data);
        const vendor = parsed.Vendor;

        return {
            id: vendor.Id,
            sync_token: vendor.SyncToken,
            ...(vendor.DisplayName !== undefined && { display_name: vendor.DisplayName }),
            ...(vendor.GivenName != null && { given_name: vendor.GivenName }),
            ...(vendor.FamilyName != null && { family_name: vendor.FamilyName }),
            ...(vendor.CompanyName != null && { company_name: vendor.CompanyName }),
            ...(vendor.PrimaryEmailAddr?.Address != null && {
                email: vendor.PrimaryEmailAddr.Address
            }),
            ...(vendor.PrimaryPhone?.FreeFormNumber != null && {
                phone: vendor.PrimaryPhone.FreeFormNumber
            }),
            ...(vendor.BillAddr != null && {
                address: {
                    ...(vendor.BillAddr.Line1 != null && { line1: vendor.BillAddr.Line1 }),
                    ...(vendor.BillAddr.City != null && { city: vendor.BillAddr.City }),
                    ...(vendor.BillAddr.Country != null && { country: vendor.BillAddr.Country }),
                    ...(vendor.BillAddr.PostalCode != null && {
                        postal_code: vendor.BillAddr.PostalCode
                    })
                }
            }),
            ...(vendor.Active !== undefined && { active: vendor.Active })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
