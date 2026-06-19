import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    api_version: z.string().describe('API version to use (e.g., "v60.0"). If omitted, uses the default version from the connection.').optional()
});

const SObjectSchema = z.object({
    name: z.string().describe('Name of the sObject.'),
    label: z.string().describe('Display label for the sObject.'),
    custom: z.boolean().describe('Whether the sObject is a custom object.'),
    keyPrefix: z.string().nullable().describe('Record ID prefix for this sObject type.').optional(),
    labelPlural: z.string().describe('Plural display label for the sObject.').optional(),
    layoutable: z.boolean().describe('Whether the sObject supports layouts.').optional(),
    activateable: z.boolean().describe('Whether the sObject can be activated.').optional(),
    createable: z.boolean().describe('Whether records of this sObject can be created.'),
    deletable: z.boolean().describe('Whether records of this sObject can be deleted.'),
    updateable: z.boolean().describe('Whether records of this sObject can be updated.'),
    queryable: z.boolean().describe('Whether records of this sObject can be queried.'),
    feedEnabled: z.boolean().describe('Whether feeds are enabled for this sObject.').optional(),
    mergeable: z.boolean().describe('Whether records of this sObject can be merged.').optional(),
    replicateable: z.boolean().describe('Whether records of this sObject can be replicated.').optional(),
    retrieveable: z.boolean().describe('Whether records of this sObject can be retrieved.').optional(),
    searchLayoutable: z.boolean().describe('Whether the sObject supports search layouts.').optional(),
    searchable: z.boolean().describe('Whether records of this sObject can be searched.'),
    triggerable: z.boolean().describe('Whether triggers are supported for this sObject.').optional(),
    deprecatedAndHidden: z.boolean().describe('Whether the sObject is deprecated and hidden.').optional(),
    hasSubtypes: z.boolean().describe('Whether the sObject has subtypes.').optional(),
    isSubtype: z.boolean().describe('Whether the sObject is a subtype.').optional(),
    idEnabled: z.boolean().describe('Whether IDs are enabled for this sObject.').optional(),
    urls: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    encoding: z.string().describe('Character encoding used by the org.'),
    maxBatchSize: z.number().describe('Maximum number of records that can be processed in a single batch.'),
    sobjects: z.array(SObjectSchema).describe('List of available sObject types and their metadata.')
});

const OutputSchema = z.object({
    encoding: z.string().describe('Character encoding used by the org.'),
    max_batch_size: z.number().describe('Maximum number of records that can be processed in a single batch.'),
    sobjects: z.array(SObjectSchema).describe('List of available sObject types and their metadata.')
});

const action = createAction({
    description: 'List available sObject types and global metadata for the org.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Salesforce REST API - Describe Global: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_describeGlobal.htm
        // Construct endpoint with API version. Default to v59.0 if not provided.
        const apiVersion = input.api_version || 'v59.0';
        const response = await nango.get({
            endpoint: `/services/data/${encodeURIComponent(apiVersion)}/sobjects`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            encoding: providerData.encoding,
            max_batch_size: providerData.maxBatchSize,
            sobjects: providerData.sobjects
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
