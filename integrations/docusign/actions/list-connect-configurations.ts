import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ConnectConfigurationSchema = z
    .object({
        configurationId: z.number().optional(),
        urlToPublishTo: z.string().optional(),
        name: z.string().optional(),
        allowEnvelopesPublish: z.string().optional(),
        enableLog: z.string().optional(),
        includeDocuments: z.string().optional(),
        includeCertificateOfCompletion: z.string().optional(),
        requiresAcknowledgement: z.string().optional(),
        signMessageWithX509Certificate: z.string().optional(),
        useSoapInterface: z.string().optional(),
        includeTimeZoneInformation: z.string().optional(),
        includeEnvelopeVoidReason: z.string().optional(),
        envelopeEvents: z.array(z.string()).optional(),
        recipientEvents: z.array(z.string()).optional(),
        includeSenderAccountAsCustomField: z.string().optional(),
        publishToWeb: z.string().optional(),
        eventData: z
            .object({
                version: z.string().optional(),
                format: z.string().optional(),
                includeData: z.array(z.string()).optional()
            })
            .passthrough()
            .optional(),
        allUsers: z.string().optional(),
        integratorManaged: z.string().optional(),
        userIds: z.array(z.string()).optional(),
        salesforcePublish: z.object({}).passthrough().optional(),
        externalFolderIds: z.array(z.string()).optional(),
        allExternalFoldersEnabled: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    configurations: z.array(ConnectConfigurationSchema),
    totalRecords: z.string().optional()
});

const action = createAction({
    description: 'List Connect (webhook) configurations for the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ accountId?: string }>();
        const accountId = metadata?.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const response = await nango.get({
            // https://developers.docusign.com/docs/esign-rest-api/reference/connect/connectconfigurations/getconnectconfigurations/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/connect`,
            retries: 3
        });

        const providerData = z
            .object({
                configurations: z.array(z.unknown()).optional(),
                totalRecords: z.string().optional()
            })
            .passthrough()
            .parse(response.data);

        const configurations = (providerData.configurations || []).map((config: unknown) => ConnectConfigurationSchema.parse(config));

        return {
            configurations,
            ...(providerData.totalRecords !== undefined && {
                totalRecords: providerData.totalRecords
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
