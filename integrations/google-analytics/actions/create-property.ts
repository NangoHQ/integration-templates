import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parent: z.string().describe('The resource name of the account under which to create the property. Example: "accounts/12345"'),
    displayName: z.string().describe('Human-readable display name for the property. Max 100 UTF-16 code units.'),
    timeZone: z.string().describe('Reporting time zone for the property. Example: "America/Los_Angeles"'),
    currencyCode: z.string().optional().describe('Currency type used in reports. Example: "USD"'),
    industryCategory: z.string().optional().describe('Industry category for benchmarking. Example: "TECHNOLOGY"'),
    serviceLevel: z.string().optional().describe('Service level. Example: "STANDARD" or "GOOGLE_ANALYTICS_360"'),
    propertyType: z.string().optional().describe('Property type. Example: "ORDINARY_PROPERTY"')
});

const ProviderPropertySchema = z.object({
    name: z.string(),
    parent: z.string(),
    displayName: z.string(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    timeZone: z.string().optional(),
    currencyCode: z.string().optional(),
    industryCategory: z.string().optional(),
    serviceLevel: z.string().optional(),
    propertyType: z.string().optional(),
    account: z.string().optional(),
    deleteTime: z.string().optional(),
    expireTime: z.string().optional()
});

const OutputSchema = z.object({
    name: z.string().describe('Resource name of the created property. Example: "properties/12345"'),
    parent: z.string().describe('Parent account name. Example: "accounts/12345"'),
    displayName: z.string(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    timeZone: z.string().optional(),
    currencyCode: z.string().optional(),
    industryCategory: z.string().optional(),
    serviceLevel: z.string().optional(),
    propertyType: z.string().optional(),
    account: z.string().optional()
});

const action = createAction({
    description: 'Create a GA4 property under an account.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/analytics.edit'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        interface PropertyCreateRequest {
            parent: string;
            displayName: string;
            timeZone?: string;
            currencyCode?: string;
            industryCategory?: string;
            serviceLevel?: string;
            propertyType?: string;
        }

        const requestBody: PropertyCreateRequest = {
            parent: input.parent,
            displayName: input.displayName
        };

        if (input.timeZone !== undefined) {
            requestBody.timeZone = input.timeZone;
        }
        if (input.currencyCode !== undefined) {
            requestBody.currencyCode = input.currencyCode;
        }
        if (input.industryCategory !== undefined) {
            requestBody.industryCategory = input.industryCategory;
        }
        if (input.serviceLevel !== undefined) {
            requestBody.serviceLevel = input.serviceLevel;
        }
        if (input.propertyType !== undefined) {
            requestBody.propertyType = input.propertyType;
        }

        // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/create
        const response = await nango.post({
            baseUrlOverride: 'https://analyticsadmin.googleapis.com',
            endpoint: '/v1beta/properties',
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Empty response from Google Analytics Admin API when creating property.'
            });
        }

        const providerProperty = ProviderPropertySchema.parse(response.data);

        return {
            name: providerProperty.name,
            parent: providerProperty.parent,
            displayName: providerProperty.displayName,
            ...(providerProperty.createTime !== undefined && { createTime: providerProperty.createTime }),
            ...(providerProperty.updateTime !== undefined && { updateTime: providerProperty.updateTime }),
            ...(providerProperty.timeZone !== undefined && { timeZone: providerProperty.timeZone }),
            ...(providerProperty.currencyCode !== undefined && { currencyCode: providerProperty.currencyCode }),
            ...(providerProperty.industryCategory !== undefined && { industryCategory: providerProperty.industryCategory }),
            ...(providerProperty.serviceLevel !== undefined && { serviceLevel: providerProperty.serviceLevel }),
            ...(providerProperty.propertyType !== undefined && { propertyType: providerProperty.propertyType }),
            ...(providerProperty.account !== undefined && { account: providerProperty.account })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
