import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const MetadataSchema = z.object({
    accountId: z.string().describe('DocuSign account ID from the post-connection script.')
});

const SettingsResponseSchema = z
    .object({
        canSelfBrandSend: z.string().optional(),
        canSelfBrandSign: z.string().optional()
    })
    .passthrough();

const BrandSchema = z
    .object({
        brandId: z.string(),
        brandName: z.string().optional()
    })
    .passthrough();

const BrandsResponseSchema = z
    .object({
        brands: z.array(BrandSchema).optional(),
        recipientBrandIdDefault: z.string().optional(),
        senderBrandIdDefault: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    brands: z.array(BrandSchema),
    recipientBrandIdDefault: z.string().optional(),
    senderBrandIdDefault: z.string().optional()
});

const action = createAction({
    description: 'List branding profiles for the account. Requires Branding feature (enterprise plans).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    endpoint: {
        method: 'GET',
        path: '/actions/list-brands'
    },
    scopes: ['signature'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accounts/listsettings/
        const settingsResponse = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/settings`,
            retries: 3
        });

        const parsedSettings = SettingsResponseSchema.safeParse(settingsResponse.data);
        if (!parsedSettings.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse account settings response.'
            });
        }

        const canBrand = parsedSettings.data.canSelfBrandSend === 'true' || parsedSettings.data.canSelfBrandSign === 'true';
        if (!canBrand) {
            throw new nango.ActionError({
                type: 'account_lacks_permissions',
                message: 'Branding is not enabled on this account. canSelfBrandSend or canSelfBrandSign must be true.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accountbrands/
        const brandsResponse = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/brands`,
            retries: 3
        });

        const parsedBrands = BrandsResponseSchema.safeParse(brandsResponse.data);
        if (!parsedBrands.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse brands response.'
            });
        }

        return {
            brands: parsedBrands.data.brands ?? [],
            ...(parsedBrands.data.recipientBrandIdDefault !== undefined && { recipientBrandIdDefault: parsedBrands.data.recipientBrandIdDefault }),
            ...(parsedBrands.data.senderBrandIdDefault !== undefined && { senderBrandIdDefault: parsedBrands.data.senderBrandIdDefault })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
