import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organizationId: z.number().describe('Organization ID. Example: 8242280')
});

const TeamSchema = z.object({
    id: z.number(),
    name: z.string()
});

const FeatureControlSchema = z.object({
    name: z.string(),
    enabled: z.boolean()
});

const ProviderOrganizationSchema = z.object({
    id: z.number(),
    name: z.string(),
    createdAt: z.string().optional(),
    serviceName: z.string().optional(),
    nextReset: z.string().optional(),
    lastReset: z.string().optional(),
    isPaused: z.boolean().optional(),
    countryId: z.number().optional(),
    timezoneId: z.number().optional(),
    deleted: z.boolean().optional(),
    license: z.record(z.string(), z.unknown()).optional(),
    zone: z.string().optional(),
    teams: z.array(TeamSchema).optional(),
    productName: z.string().optional(),
    ssoType: z.string().nullable().optional(),
    scenarios: z.number().optional(),
    activeScenarios: z.number().optional(),
    tfaEnforced: z.boolean().optional(),
    featureControls: z.array(FeatureControlSchema).optional()
});

const ProviderResponseSchema = z.object({
    organization: ProviderOrganizationSchema
});

const OutputSchema = z.object({
    organization: z.object({
        id: z.number(),
        name: z.string(),
        createdAt: z.string().optional(),
        serviceName: z.string().optional(),
        nextReset: z.string().optional(),
        lastReset: z.string().optional(),
        isPaused: z.boolean().optional(),
        countryId: z.number().optional(),
        timezoneId: z.number().optional(),
        deleted: z.boolean().optional(),
        license: z.record(z.string(), z.unknown()).optional(),
        zone: z.string().optional(),
        teams: z.array(TeamSchema).optional(),
        productName: z.string().optional(),
        ssoType: z.string().optional(),
        scenarios: z.number().optional(),
        activeScenarios: z.number().optional(),
        tfaEnforced: z.boolean().optional(),
        featureControls: z.array(FeatureControlSchema).optional()
    })
});

const action = createAction({
    description: 'Retrieve details of a single organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['organizations:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/
        const response = await nango.get({
            endpoint: `/organizations/${encodeURIComponent(input.organizationId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found',
                organizationId: input.organizationId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const org = providerResponse.organization;

        return {
            organization: {
                id: org.id,
                name: org.name,
                ...(org.createdAt !== undefined && { createdAt: org.createdAt }),
                ...(org.serviceName !== undefined && { serviceName: org.serviceName }),
                ...(org.nextReset !== undefined && { nextReset: org.nextReset }),
                ...(org.lastReset !== undefined && { lastReset: org.lastReset }),
                ...(org.isPaused !== undefined && { isPaused: org.isPaused }),
                ...(org.countryId !== undefined && { countryId: org.countryId }),
                ...(org.timezoneId !== undefined && { timezoneId: org.timezoneId }),
                ...(org.deleted !== undefined && { deleted: org.deleted }),
                ...(org.license !== undefined && { license: org.license }),
                ...(org.zone !== undefined && { zone: org.zone }),
                ...(org.teams !== undefined && { teams: org.teams }),
                ...(org.productName !== undefined && { productName: org.productName }),
                ...(org.ssoType !== undefined && org.ssoType !== null && { ssoType: org.ssoType }),
                ...(org.scenarios !== undefined && { scenarios: org.scenarios }),
                ...(org.activeScenarios !== undefined && { activeScenarios: org.activeScenarios }),
                ...(org.tfaEnforced !== undefined && { tfaEnforced: org.tfaEnforced }),
                ...(org.featureControls !== undefined && { featureControls: org.featureControls })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
