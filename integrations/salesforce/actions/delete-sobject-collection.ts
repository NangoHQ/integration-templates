import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    api_version: z.string().optional().describe('API version to use (e.g., "v62.0"). If not provided, the latest version will be discovered.'),
    sObjectName: z.string().describe('The type of sObject to delete (e.g., "Account", "Contact", "Opportunity").'),
    ids: z.array(z.string()).describe('Array of record IDs to delete.'),
    allOrNone: z.boolean().optional().describe('If true, all deletions must succeed for any to succeed (transactional). If false, partial success is allowed.')
});

const DeleteErrorSchema = z.object({
    statusCode: z.string(),
    message: z.string(),
    fields: z.array(z.string()).optional()
});

const DeleteResultSchema = z.object({
    id: z.string().optional(),
    success: z.boolean(),
    errors: z.array(DeleteErrorSchema).optional()
});

const OutputSchema = z.object({
    results: z.array(DeleteResultSchema).describe('Results for each record deletion.')
});

const VersionItemSchema = z.object({
    version: z.string()
});

const ProviderDeleteResultSchema = z.object({
    id: z.string().optional(),
    success: z.boolean(),
    errors: z
        .array(
            z.object({
                statusCode: z.union([z.string(), z.number()]).optional(),
                message: z.string().optional(),
                fields: z.array(z.string()).optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Delete multiple records in one sObject collection request.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let apiVersion = input.api_version;

        if (!apiVersion) {
            // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_versions.htm
            const versionsResponse = await nango.get({
                endpoint: '/services/data',
                retries: 3
            });

            const versions = versionsResponse.data;
            if (!Array.isArray(versions) || versions.length === 0) {
                throw new nango.ActionError({
                    type: 'discovery_failed',
                    message: 'Failed to discover Salesforce API versions'
                });
            }

            const latest = versions[versions.length - 1];
            const parsed = VersionItemSchema.safeParse(latest);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'discovery_failed',
                    message: 'Invalid API version response from Salesforce'
                });
            }

            apiVersion = `v${parsed.data.version}`;
        }

        if (!apiVersion.startsWith('v')) {
            apiVersion = `v${apiVersion}`;
        }

        const idsParam = input.ids.map((id) => encodeURIComponent(id)).join(',');

        const params: Record<string, string> = {
            ids: idsParam,
            allOrNone: String(input.allOrNone ?? false)
        };

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections_delete.htm
        const response = await nango.delete({
            endpoint: `/services/data/${apiVersion}/composite/sobjects`,
            params: {
                ...params,
                sObjectName: encodeURIComponent(input.sObjectName)
            },
            retries: 10
        });

        if (!response.data || !Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Salesforce delete operation'
            });
        }

        const results = response.data.map((item: unknown) => {
            const parsed = ProviderDeleteResultSchema.safeParse(item);
            if (!parsed.success) {
                return {
                    success: false,
                    errors: [{ statusCode: 'UNKNOWN', message: 'Invalid result item' }]
                };
            }

            const data = parsed.data;
            return {
                ...(data.id !== undefined && { id: data.id }),
                success: data.success,
                ...(data.errors !== undefined &&
                    data.errors.length > 0 && {
                        errors: data.errors.map((err) => ({
                            statusCode: String(err.statusCode ?? 'UNKNOWN'),
                            message: String(err.message ?? 'Unknown error'),
                            ...(err.fields !== undefined && { fields: err.fields })
                        }))
                    })
            };
        });

        return {
            results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
