import { createSync } from 'nango';
import { z } from 'zod';

const BrandSchema = z.object({
    id: z.string(),
    brandId: z.string(),
    brandName: z.string().optional(),
    brandCompany: z.string().optional(),
    defaultBrandLanguage: z.string().optional(),
    brandLanguages: z.array(z.string()).optional(),
    isSendingDefault: z.boolean().optional(),
    isSigningDefault: z.boolean().optional(),
    isOrganizationBrand: z.string().optional(),
    isOverridingCompanyName: z.boolean().optional()
});

const BrandsResponseSchema = z.object({
    brands: z.array(z.unknown()).optional()
});

const BrandItemSchema = z.object({
    brandId: z.string().optional(),
    brandName: z.string().optional(),
    brandCompany: z.string().optional(),
    defaultBrandLanguage: z.string().optional(),
    brandLanguages: z.array(z.string()).optional(),
    isSendingDefault: z.boolean().optional(),
    isSigningDefault: z.boolean().optional(),
    isOrganizationBrand: z.string().optional(),
    isOverridingCompanyName: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync branding profiles. Requires Branding feature (enterprise plans).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    models: {
        Brand: BrandSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            accountId: z.string().optional()
        });
        const metadataResult = metadataSchema.safeParse(metadata ?? {});
        if (!metadataResult.success) {
            throw new Error(`Failed to parse connection metadata: ${JSON.stringify(metadata)}`);
        }
        const accountId = metadataResult.data.accountId;
        if (!accountId) {
            throw new Error('accountId is required in connection metadata');
        }

        // Blocker: provider only exposes GET /brands with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('Brand');

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/brands/brandgetlist/
        let brandsResponse;
        // @allowTryCatch: DocuSign returns ACCOUNT_LACKS_PERMISSIONS when branding is not enabled.
        // We catch this to provide a clear error message before the sync fails opaquely.
        try {
            brandsResponse = await nango.get({
                endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/brands`,
                retries: 3
            });
        } catch (error: unknown) {
            const errorSchema = z.object({
                payload: z
                    .object({
                        errorCode: z.string().optional(),
                        message: z.string().optional()
                    })
                    .optional(),
                message: z.string().optional()
            });
            const errorResult = errorSchema.safeParse(error);
            const errorCode = errorResult.success ? errorResult.data.payload?.errorCode : undefined;
            const errorMessage = errorResult.success ? errorResult.data.message : error instanceof Error ? error.message : JSON.stringify(error);
            if (errorCode === 'ACCOUNT_LACKS_PERMISSIONS' || errorMessage?.includes('ACCOUNT_LACKS_PERMISSIONS')) {
                throw new Error('Branding is not enabled on this account. The sync requires canSelfBrandSend or canSelfBrandSign to be true.');
            }
            throw error;
        }

        // Guard against error-shaped responses (e.g. { errorCode, message }) that lack a brands key.
        // A valid empty response is {} (no brands configured); a valid non-empty response has brands.
        const responseData = brandsResponse.data;
        if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
            const keys = Object.keys(responseData);
            if (keys.length > 0 && !('brands' in responseData)) {
                throw new Error(`Unexpected brands response: missing brands field. Response keys: ${keys.join(', ')}`);
            }
        }

        const brandsResult = BrandsResponseSchema.safeParse(responseData);
        if (!brandsResult.success) {
            throw new Error('Failed to parse brands response');
        }

        const brands = brandsResult.data.brands ?? [];

        const records = brands.map((brand: unknown) => {
            const parsed = BrandItemSchema.safeParse(brand);
            if (!parsed.success) {
                throw new Error(`Failed to parse brand item: ${JSON.stringify(brand)}`);
            }

            const item = parsed.data;
            if (!item.brandId) {
                throw new Error('Brand item missing brandId');
            }

            return {
                id: item.brandId,
                brandId: item.brandId,
                ...(item.brandName !== undefined && { brandName: item.brandName }),
                ...(item.brandCompany !== undefined && { brandCompany: item.brandCompany }),
                ...(item.defaultBrandLanguage !== undefined && { defaultBrandLanguage: item.defaultBrandLanguage }),
                ...(item.brandLanguages !== undefined && { brandLanguages: item.brandLanguages }),
                ...(item.isSendingDefault !== undefined && { isSendingDefault: item.isSendingDefault }),
                ...(item.isSigningDefault !== undefined && { isSigningDefault: item.isSigningDefault }),
                ...(item.isOrganizationBrand !== undefined && { isOrganizationBrand: item.isOrganizationBrand }),
                ...(item.isOverridingCompanyName !== undefined && { isOverridingCompanyName: item.isOverridingCompanyName })
            };
        });

        if (records.length > 0) {
            await nango.batchSave(records, 'Brand');
        }

        await nango.trackDeletesEnd('Brand');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
