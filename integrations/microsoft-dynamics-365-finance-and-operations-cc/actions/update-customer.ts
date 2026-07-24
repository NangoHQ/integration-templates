import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company/data area ID. Example: "dat"'),
    customerAccount: z.string().describe('Customer account number. Example: "DAT-000042"'),
    OrganizationName: z.string().optional(),
    NameAlias: z.string().optional(),
    SalesMemo: z.string().optional(),
    CustomerGroupId: z.string().optional(),
    SalesCurrencyCode: z.string().optional(),
    AddressCity: z.string().optional(),
    AddressCountryRegionId: z.string().optional(),
    AddressStreet: z.string().optional(),
    AddressZipCode: z.string().optional(),
    PrimaryContactEmail: z.string().optional(),
    PaymentTerms: z.string().optional(),
    DeliveryTerms: z.string().optional(),
    DeliveryMode: z.string().optional(),
    LanguageId: z.string().optional()
});

const OutputSchema = z.object({
    dataAreaId: z.string(),
    customerAccount: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Update a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const patchBody: Record<string, unknown> = {};

        if (input.OrganizationName !== undefined) {
            patchBody['OrganizationName'] = input.OrganizationName;
        }
        if (input.NameAlias !== undefined) {
            patchBody['NameAlias'] = input.NameAlias;
        }
        if (input.SalesMemo !== undefined) {
            patchBody['SalesMemo'] = input.SalesMemo;
        }
        if (input.CustomerGroupId !== undefined) {
            patchBody['CustomerGroupId'] = input.CustomerGroupId;
        }
        if (input.SalesCurrencyCode !== undefined) {
            patchBody['SalesCurrencyCode'] = input.SalesCurrencyCode;
        }
        if (input.AddressCity !== undefined) {
            patchBody['AddressCity'] = input.AddressCity;
        }
        if (input.AddressCountryRegionId !== undefined) {
            patchBody['AddressCountryRegionId'] = input.AddressCountryRegionId;
        }
        if (input.AddressStreet !== undefined) {
            patchBody['AddressStreet'] = input.AddressStreet;
        }
        if (input.AddressZipCode !== undefined) {
            patchBody['AddressZipCode'] = input.AddressZipCode;
        }
        if (input.PrimaryContactEmail !== undefined) {
            patchBody['PrimaryContactEmail'] = input.PrimaryContactEmail;
        }
        if (input.PaymentTerms !== undefined) {
            patchBody['PaymentTerms'] = input.PaymentTerms;
        }
        if (input.DeliveryTerms !== undefined) {
            patchBody['DeliveryTerms'] = input.DeliveryTerms;
        }
        if (input.DeliveryMode !== undefined) {
            patchBody['DeliveryMode'] = input.DeliveryMode;
        }
        if (input.LanguageId !== undefined) {
            patchBody['LanguageId'] = input.LanguageId;
        }

        if (Object.keys(patchBody).length === 0) {
            throw new nango.ActionError({
                type: 'missing_fields',
                message: 'At least one field to update must be provided.'
            });
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        await nango.patch({
            endpoint: `/data/CustomersV3(dataAreaId='${encodeURIComponent(input.dataAreaId.replace(/'/g, "''"))}',CustomerAccount='${encodeURIComponent(input.customerAccount.replace(/'/g, "''"))}')`,
            data: patchBody,
            retries: 3
        });

        return {
            dataAreaId: input.dataAreaId,
            customerAccount: input.customerAccount,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
