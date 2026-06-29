import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the Connect configuration. Example: "My Webhook"'),
        urlToPublishTo: z
            .string()
            .url()
            .regex(/^https:\/\//, 'URL must use HTTPS')
            .describe('HTTPS URL to publish envelope events to. Example: "https://example.com/webhook"'),
        allUsers: z.boolean().describe('When true, the configuration applies to all users in the account.'),
        userIds: z.array(z.string()).optional().describe('Array of user IDs to include when allUsers is false. Required when allUsers is false.'),
        allowEnvelopePublish: z.boolean().describe('When true, envelope publish is allowed for this configuration.'),
        envelopeEvents: z
            .array(z.enum(['sent', 'delivered', 'completed', 'declined', 'voided']))
            .describe('Envelope event statuses to subscribe to. Example: ["sent", "delivered", "completed"]'),
        recipientEvents: z
            .array(z.enum(['Sent', 'Delivered', 'Completed', 'Declined', 'AuthenticationFailed', 'AutoResponded']))
            .describe('Recipient event statuses to subscribe to. Example: ["Sent", "Delivered", "Completed"]')
    })
    .refine((data) => data.allUsers || (data.userIds && data.userIds.length > 0), {
        message: 'userIds must be provided when allUsers is false',
        path: ['userIds']
    });

const MetadataSchema = z.object({
    accountId: z.string().describe('DocuSign account ID from the post-connection script.')
});

const ProviderConnectSchema = z.object({
    connectId: z.string(),
    configurationType: z.string(),
    urlToPublishTo: z.string(),
    name: z.string(),
    allowEnvelopePublish: z.string().optional(),
    allUsers: z.string().optional(),
    envelopeEvents: z.array(z.string()).optional(),
    recipientEvents: z.array(z.string()).optional(),
    enableLog: z.string().optional(),
    includeDocuments: z.string().optional(),
    includeCertificateOfCompletion: z.string().optional(),
    requiresAcknowledgement: z.string().optional(),
    signMessageWithX509Certificate: z.string().optional(),
    useSoapInterface: z.string().optional(),
    includeTimeZoneInformation: z.string().optional(),
    includeHMAC: z.string().optional(),
    includeEnvelopeVoidReason: z.string().optional(),
    includeSenderAccountasCustomField: z.string().optional(),
    includeCertSoapHeader: z.string().optional(),
    includeDocumentFields: z.string().optional(),
    pausePublish: z.string().optional(),
    requireMutualTls: z.string().optional(),
    integratorManaged: z.string().optional(),
    enableOAuthPerConfiguration: z.string().optional(),
    deliveryMode: z.string().optional(),
    soapNamespace: z.string().optional(),
    allUsersExcept: z.string().optional(),
    includeOAuth: z.string().optional(),
    eventData: z
        .object({
            version: z.string().optional(),
            includeData: z.array(z.string()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    connectId: z.string().describe('The unique ID of the created Connect configuration.'),
    configurationType: z.string().describe('The type of Connect configuration.'),
    name: z.string().describe('The name of the Connect configuration.'),
    urlToPublishTo: z.string().describe('The URL where envelope events are published.'),
    allowEnvelopePublish: z.string().optional(),
    allUsers: z.string().optional(),
    envelopeEvents: z.array(z.string()).optional(),
    recipientEvents: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a Connect webhook configuration to receive envelope event notifications.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],
    endpoint: {
        method: 'POST',
        path: '/actions/create-connect-configuration'
    },
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;

        const response = await nango.post({
            // https://developers.docusign.com/docs/esign-rest-api/reference/connect/connectconfigurations/create/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/connect`,
            data: {
                name: input.name,
                urlToPublishTo: input.urlToPublishTo,
                allUsers: input.allUsers,
                ...(!input.allUsers && input.userIds && { userIds: input.userIds }),
                allowEnvelopePublish: input.allowEnvelopePublish,
                configurationType: 'custom',
                envelopeEvents: input.envelopeEvents,
                recipientEvents: input.recipientEvents
            },
            retries: 1
        });

        const providerConnect = ProviderConnectSchema.parse(response.data);

        return {
            connectId: providerConnect.connectId,
            configurationType: providerConnect.configurationType,
            name: providerConnect.name,
            urlToPublishTo: providerConnect.urlToPublishTo,
            ...(providerConnect.allowEnvelopePublish !== undefined && { allowEnvelopePublish: providerConnect.allowEnvelopePublish }),
            ...(providerConnect.allUsers !== undefined && { allUsers: providerConnect.allUsers }),
            ...(providerConnect.envelopeEvents !== undefined && { envelopeEvents: providerConnect.envelopeEvents }),
            ...(providerConnect.recipientEvents !== undefined && { recipientEvents: providerConnect.recipientEvents })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
