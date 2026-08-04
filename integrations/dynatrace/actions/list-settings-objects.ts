import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    schemaId: z.string().describe('Settings 2.0 schema ID. Example: "builtin:alerting.profile"'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.')
});

const ModificationInfoSchema = z.object({
    createdBy: z.string().optional(),
    createdAt: z.string().optional(),
    lastModifiedBy: z.string().optional(),
    lastModifiedAt: z.string().optional(),
    version: z.string().optional()
});

const ProviderSettingObjectSchema = z.object({
    objectId: z.string(),
    schemaId: z.string().optional(),
    schemaVersion: z.string().optional(),
    scope: z.string().optional(),
    value: z.unknown().optional(),
    modificationInfo: ModificationInfoSchema.optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderSettingObjectSchema),
    totalCount: z.number().optional(),
    pageSize: z.number().optional(),
    nextPageKey: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderSettingObjectSchema),
    nextPageKey: z.string().optional()
});

const action = createAction({
    description: 'List configured objects for a given Settings 2.0 schema.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/settings/objects/get-all-settings-objects
            endpoint: '/api/v2/settings/objects',
            params: {
                schemaIds: input.schemaId,
                ...(input.cursor !== undefined && { nextPageKey: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.items,
            ...(parsed.nextPageKey !== undefined && { nextPageKey: parsed.nextPageKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
