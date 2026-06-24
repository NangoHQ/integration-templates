import { createSync } from 'nango';
import { z } from 'zod';

const ConnectConfigurationSchema = z.object({
    id: z.string().describe('The DocuSign-generated ID for the Connect configuration'),
    name: z.string().optional(),
    urlToPublishTo: z.string().optional(),
    allowEnvelopePublish: z.string().optional(),
    allUsers: z.string().optional(),
    enableLog: z.string().optional(),
    envelopeEvents: z.array(z.string()).optional(),
    recipientEvents: z.array(z.string()).optional(),
    events: z.array(z.string()).optional(),
    configurationType: z.string().optional(),
    deliveryMode: z.string().optional(),
    requiresAcknowledgement: z.string().optional(),
    includeDocuments: z.string().optional(),
    includeCertificateOfCompletion: z.string().optional(),
    includeHMAC: z.string().optional(),
    userIds: z.array(z.string()).optional(),
    groupIds: z.array(z.string()).optional(),
    requireMutualTls: z.string().optional(),
    disabledBy: z.string().optional(),
    externalFolderId: z.string().optional(),
    externalFolderLabel: z.string().optional()
});

const ProviderConfigurationSchema = z
    .object({
        connectId: z.string(),
        name: z.string().optional(),
        urlToPublishTo: z.string().optional(),
        allowEnvelopePublish: z.string().optional(),
        allUsers: z.string().optional(),
        enableLog: z.string().optional(),
        envelopeEvents: z.array(z.string()).optional(),
        recipientEvents: z.array(z.string()).optional(),
        events: z.array(z.string()).optional(),
        configurationType: z.string().optional(),
        deliveryMode: z.string().optional(),
        requiresAcknowledgement: z.string().optional(),
        includeDocuments: z.string().optional(),
        includeCertificateOfCompletion: z.string().optional(),
        includeHMAC: z.string().optional(),
        userIds: z.array(z.string()).optional(),
        groupIds: z.array(z.string()).optional(),
        requireMutualTls: z.string().optional(),
        disabledBy: z.string().optional(),
        externalFolderId: z.string().optional(),
        externalFolderLabel: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    configurations: z.array(ProviderConfigurationSchema),
    totalRecords: z.string().optional()
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const sync = createSync({
    description: 'Sync Connect webhook configurations with full-refresh delete tracking',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        ConnectConfiguration: ConnectConfigurationSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(rawMetadata);

        if (!metadata.success) {
            throw new Error(`Failed to parse metadata: ${metadata.error.message}`);
        }

        if (!metadata.data.accountId) {
            throw new Error('accountId is required in metadata');
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/connectconfigurations/getconnectconfigurations/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(metadata.data.accountId)}/connect`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Failed to parse Connect configurations: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('ConnectConfiguration');

        const configurations = parsed.data.configurations;
        const records = configurations.map((config) => ({
            id: config.connectId,
            ...(config.name != null && { name: config.name }),
            ...(config.urlToPublishTo != null && { urlToPublishTo: config.urlToPublishTo }),
            ...(config.allowEnvelopePublish != null && { allowEnvelopePublish: config.allowEnvelopePublish }),
            ...(config.allUsers != null && { allUsers: config.allUsers }),
            ...(config.enableLog != null && { enableLog: config.enableLog }),
            ...(config.envelopeEvents != null && { envelopeEvents: config.envelopeEvents }),
            ...(config.recipientEvents != null && { recipientEvents: config.recipientEvents }),
            ...(config.events != null && { events: config.events }),
            ...(config.configurationType != null && { configurationType: config.configurationType }),
            ...(config.deliveryMode != null && { deliveryMode: config.deliveryMode }),
            ...(config.requiresAcknowledgement != null && { requiresAcknowledgement: config.requiresAcknowledgement }),
            ...(config.includeDocuments != null && { includeDocuments: config.includeDocuments }),
            ...(config.includeCertificateOfCompletion != null && { includeCertificateOfCompletion: config.includeCertificateOfCompletion }),
            ...(config.includeHMAC != null && { includeHMAC: config.includeHMAC }),
            ...(config.userIds != null && { userIds: config.userIds }),
            ...(config.groupIds != null && { groupIds: config.groupIds }),
            ...(config.requireMutualTls != null && { requireMutualTls: config.requireMutualTls }),
            ...(config.disabledBy != null && { disabledBy: config.disabledBy }),
            ...(config.externalFolderId != null && { externalFolderId: config.externalFolderId }),
            ...(config.externalFolderLabel != null && { externalFolderLabel: config.externalFolderLabel })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'ConnectConfiguration');
        }

        await nango.trackDeletesEnd('ConnectConfiguration');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
