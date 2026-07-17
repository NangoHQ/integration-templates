import { createSync } from 'nango';
import { z } from 'zod';

const ProviderCustomFieldSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    fieldKey: z.string().optional(),
    placeholder: z.string().optional(),
    dataType: z.string().optional(),
    position: z.number().optional(),
    picklistOptions: z.array(z.string()).optional(),
    picklistImageOptions: z.array(z.string()).optional(),
    isAllowedCustomOption: z.boolean().optional(),
    isMultiFileAllowed: z.boolean().optional(),
    maxFileLimit: z.number().optional(),
    locationId: z.string().optional(),
    model: z.string().optional()
});

const ProviderResponseSchema = z.object({
    customFields: z.array(ProviderCustomFieldSchema).optional()
});

const ConnectionMetadataSchema = z.object({
    locationId: z.string().optional()
});

const CustomFieldSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    fieldKey: z.string().optional(),
    placeholder: z.string().optional(),
    dataType: z.string().optional(),
    position: z.number().optional(),
    picklistOptions: z.array(z.string()).optional(),
    picklistImageOptions: z.array(z.string()).optional(),
    isAllowedCustomOption: z.boolean().optional(),
    isMultiFileAllowed: z.boolean().optional(),
    maxFileLimit: z.number().optional(),
    locationId: z.string().optional(),
    model: z.string().optional()
});

const sync = createSync({
    description: 'Sync custom fields from HighLevel',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CustomField: CustomFieldSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const connectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        });
        const parsedConnection = connectionSchema.safeParse(connection);

        let rawLocationId = parsedConnection.success
            ? (parsedConnection.data.connection_config?.['locationId'] ?? parsedConnection.data.metadata?.['locationId'])
            : undefined;
        if (typeof rawLocationId !== 'string') {
            const rawMetadata = await nango.getMetadata();
            const metadataResult = ConnectionMetadataSchema.safeParse(rawMetadata);
            if (metadataResult.success) {
                rawLocationId = metadataResult.data.locationId;
            }
        }
        if (typeof rawLocationId !== 'string') {
            throw new Error('locationId is required in connection configuration or metadata');
        }
        const locationId = rawLocationId;

        // https://highlevel.stoplight.io/docs/integrations/
        const response = await nango.get({
            endpoint: `/locations/${encodeURIComponent(locationId)}/customFields`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error(`Failed to parse custom fields response: ${parsedResponse.error.message}`);
        }

        // trackDeletesStart is deferred until after the response is validated so a request
        // or parse failure never leaves delete-tracking open without a matching End.
        await nango.trackDeletesStart('CustomField');

        const customFields = parsedResponse.data.customFields ?? [];
        if (customFields.length > 0) {
            await nango.batchSave(customFields, 'CustomField');
        }

        await nango.trackDeletesEnd('CustomField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
