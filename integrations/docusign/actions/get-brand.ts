import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    brandId: z.string().describe('Brand ID. Example: "12345"')
});

const OutputSchema = z.object({
    brandId: z.string().optional(),
    brandName: z.string().optional(),
    brandCompany: z.string().optional(),
    defaultBrandLanguage: z.string().optional(),
    brandLanguages: z.array(z.string()).optional(),
    isSendingDefault: z.boolean().optional(),
    isSigningDefault: z.boolean().optional(),
    isOverridingCompanyName: z.boolean().optional(),
    isOrganizationBrand: z.string().optional()
});

const ProviderBrandSchema = z.object({
    brandId: z.string().optional(),
    brandName: z.string().optional(),
    brandCompany: z.string().optional(),
    defaultBrandLanguage: z.string().optional(),
    brandLanguages: z.array(z.string()).optional(),
    isSendingDefault: z.boolean().optional(),
    isSigningDefault: z.boolean().optional(),
    isOverridingCompanyName: z.boolean().optional(),
    isOrganizationBrand: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a specific brand by ID. Requires Branding feature (enterprise plans).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],
    endpoint: {
        path: '/actions/get-brand',
        method: 'GET'
    },
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            accountId: z.string().optional()
        });
        const parsedMetadata = metadataSchema.parse(metadata);
        const accountId = parsedMetadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'missing_account_id',
                message: 'accountId is missing in connection metadata.'
            });
        }

        const response = await nango.get({
            // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accountbrands/get/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/brands/${encodeURIComponent(input.brandId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Brand not found',
                brandId: input.brandId
            });
        }

        const brand = ProviderBrandSchema.parse(response.data);

        return {
            ...(brand.brandId !== undefined && { brandId: brand.brandId }),
            ...(brand.brandName !== undefined && { brandName: brand.brandName }),
            ...(brand.brandCompany !== undefined && { brandCompany: brand.brandCompany }),
            ...(brand.defaultBrandLanguage !== undefined && { defaultBrandLanguage: brand.defaultBrandLanguage }),
            ...(brand.brandLanguages !== undefined && { brandLanguages: brand.brandLanguages }),
            ...(brand.isSendingDefault !== undefined && { isSendingDefault: brand.isSendingDefault }),
            ...(brand.isSigningDefault !== undefined && { isSigningDefault: brand.isSigningDefault }),
            ...(brand.isOverridingCompanyName !== undefined && { isOverridingCompanyName: brand.isOverridingCompanyName }),
            ...(brand.isOrganizationBrand !== undefined && { isOrganizationBrand: brand.isOrganizationBrand })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
