import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        locale: z.string().optional().describe('Locale code. Example: "en"'),
        countryCode: z.string().optional().describe('Country code. Example: "US"'),
        locationNames: z
            .object({
                names: z.array(z.string())
            })
            .optional()
            .describe('Location names to search by. At most 25 names can be set.'),
        geoTargetConstants: z
            .object({
                resourceNames: z.array(z.string())
            })
            .optional()
            .describe('Geo target constant resource names to filter by.'),
        developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
    })
    .refine((data) => data.locationNames !== undefined || data.geoTargetConstants !== undefined, {
        message: 'Either locationNames or geoTargetConstants must be provided.'
    });

const GeoTargetConstantSchema = z.object({
    resourceName: z.string(),
    id: z.string().optional(),
    name: z.string().optional(),
    countryCode: z.string().optional(),
    targetType: z.string().optional(),
    status: z.string().optional(),
    canonicalName: z.string().optional()
});

const GeoTargetConstantSuggestionSchema = z.object({
    geoTargetConstant: GeoTargetConstantSchema,
    geoTargetConstantParents: z.array(GeoTargetConstantSchema).optional(),
    locale: z.string().optional(),
    reach: z.string().optional(),
    searchTerm: z.string().optional()
});

const ProviderResponseSchema = z.object({
    geoTargetConstantSuggestions: z.array(GeoTargetConstantSuggestionSchema).optional()
});

const OutputSchema = z.object({
    geoTargetConstantSuggestions: z.array(GeoTargetConstantSuggestionSchema)
});

const action = createAction({
    description: 'Look up geo target constant resource names for location names or codes, for use in campaign location targeting.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            ...(input.locale !== undefined && { locale: input.locale }),
            ...(input.countryCode !== undefined && { countryCode: input.countryCode }),
            ...(input.locationNames !== undefined && { locationNames: { names: input.locationNames.names } }),
            ...(input.geoTargetConstants !== undefined && { geoTargets: { geoTargetConstants: input.geoTargetConstants.resourceNames } })
        };

        const config: ProxyConfiguration = {
            // https://developers.google.com/google-ads/api/rest/reference/rest/v21/geoTargetConstants/suggest
            endpoint: 'v21/geoTargetConstants:suggest',
            data: requestBody,
            headers: {
                'developer-token': input.developerToken
            },
            retries: 3
        };

        const response = await nango.post(config);
        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            geoTargetConstantSuggestions: parsed.geoTargetConstantSuggestions ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
