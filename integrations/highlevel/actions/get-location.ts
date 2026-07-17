import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderBusinessSchema = z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    website: z.string().optional(),
    timezone: z.string().optional(),
    logoUrl: z.string().optional()
});

const ProviderSocialSchema = z.object({
    facebookUrl: z.string().optional(),
    googlePlus: z.string().optional(),
    linkedIn: z.string().optional(),
    foursquare: z.string().optional(),
    twitter: z.string().optional(),
    yelp: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
    pinterest: z.string().optional(),
    blogRss: z.string().optional(),
    googlePlacesId: z.string().optional()
});

const ProviderSettingsSchema = z.object({
    allowDuplicateContact: z.boolean().optional(),
    allowDuplicateOpportunity: z.boolean().optional(),
    allowFacebookNameMerge: z.boolean().optional(),
    disableContactTimezone: z.boolean().optional()
});

const ProviderLocationSchema = z.object({
    id: z.string(),
    companyId: z.string().optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    logoUrl: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    website: z.string().optional(),
    timezone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    business: ProviderBusinessSchema.optional().nullable(),
    social: ProviderSocialSchema.optional().nullable(),
    settings: ProviderSettingsSchema.optional().nullable(),
    reseller: z.record(z.string(), z.unknown()).optional().nullable()
});

const ProviderResponseSchema = z.object({
    location: ProviderLocationSchema
});

const OutputSchema = z.object({
    id: z.string(),
    companyId: z.string().optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    logoUrl: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    website: z.string().optional(),
    timezone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    business: ProviderBusinessSchema.optional(),
    social: ProviderSocialSchema.optional(),
    settings: ProviderSettingsSchema.optional(),
    reseller: z.record(z.string(), z.unknown()).optional()
});

const MetadataSchema = z.object({
    locationId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve details about the connected HighLevel location (sub-account).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations.readonly'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        if (!metadata) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'locationId is required in connection metadata.'
            });
        }

        const parsedMetadata = MetadataSchema.parse(metadata);
        const locationId = parsedMetadata.locationId;

        if (!locationId) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'locationId is required in connection metadata.'
            });
        }

        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/locations/${encodeURIComponent(locationId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const location = providerResponse.location;

        return {
            id: location.id,
            ...(location.companyId !== undefined && { companyId: location.companyId }),
            ...(location.name !== undefined && { name: location.name }),
            ...(location.domain !== undefined && { domain: location.domain }),
            ...(location.address !== undefined && { address: location.address }),
            ...(location.city !== undefined && { city: location.city }),
            ...(location.logoUrl !== undefined && { logoUrl: location.logoUrl }),
            ...(location.country !== undefined && { country: location.country }),
            ...(location.postalCode !== undefined && { postalCode: location.postalCode }),
            ...(location.website !== undefined && { website: location.website }),
            ...(location.timezone !== undefined && { timezone: location.timezone }),
            ...(location.firstName !== undefined && { firstName: location.firstName }),
            ...(location.lastName !== undefined && { lastName: location.lastName }),
            ...(location.email !== undefined && { email: location.email }),
            ...(location.phone !== undefined && { phone: location.phone }),
            ...(location.business != null && { business: location.business }),
            ...(location.social != null && { social: location.social }),
            ...(location.settings != null && { settings: location.settings }),
            ...(location.reseller != null && { reseller: location.reseller })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
