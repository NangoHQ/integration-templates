import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    schemaId: z.string().describe('The Settings 2.0 schema ID. Example: "builtin:user-settings"'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.'),
    pageSize: z.number().optional().describe('Number of objects per page. Max 500.')
});

const IdentitySchema = z.object({
    id: z.string().optional(),
    type: z.string()
});

const ModificationSchema = z.object({
    first: z.boolean().optional(),
    modifiablePaths: z.array(z.string()).optional(),
    movable: z.boolean().optional(),
    nonModifiablePaths: z.array(z.string()).optional()
});

const ResourceContextSchema = z.object({
    modifications: ModificationSchema.optional(),
    operations: z.array(z.string()).optional()
});

const ModificationInfoSchema = z.object({
    deletable: z.boolean().optional(),
    first: z.boolean().optional(),
    modifiable: z.boolean().optional(),
    modifiablePaths: z.array(z.string()).optional(),
    movable: z.boolean().optional(),
    nonModifiablePaths: z.array(z.string()).optional()
});

const SettingsObjectSchema = z.object({
    objectId: z.string(),
    schemaId: z.string().optional(),
    schemaVersion: z.string().optional(),
    scope: z.string().optional(),
    summary: z.string().optional(),
    searchSummary: z.string().optional(),
    created: z.number().optional(),
    modified: z.number().optional(),
    createdBy: z.string().optional(),
    modifiedBy: z.string().optional(),
    author: z.string().optional(),
    updateToken: z.string().optional(),
    value: z.unknown().optional(),
    externalId: z.string().optional(),
    owner: IdentitySchema.optional(),
    resourceContext: ResourceContextSchema.optional(),
    modificationInfo: ModificationInfoSchema.optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(SettingsObjectSchema),
    nextPageKey: z.string().nullable().optional(),
    pageSize: z.number().optional(),
    totalCount: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(SettingsObjectSchema),
    nextPageKey: z.string().optional(),
    pageSize: z.number().optional(),
    totalCount: z.number().optional()
});

const action = createAction({
    description: 'List configured objects for a given Settings 2.0 schema.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { nextPageKey?: string; schemaIds?: string; pageSize?: number } = {};
        if (input.cursor) {
            params.nextPageKey = input.cursor;
        } else {
            params.schemaIds = input.schemaId;
            if (input.pageSize !== undefined) {
                params.pageSize = input.pageSize;
            }
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/settings/objects/get-objects
            endpoint: '/api/v2/settings/objects',
            params,
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        return {
            items: providerResponse.items,
            ...(providerResponse.nextPageKey != null && { nextPageKey: providerResponse.nextPageKey }),
            ...(providerResponse.pageSize != null && { pageSize: providerResponse.pageSize }),
            ...(providerResponse.totalCount != null && { totalCount: providerResponse.totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
