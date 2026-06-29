import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    connectId: z.string().describe('The DocuSign-generated ID for the Connect configuration. Example: "22210617"'),
    name: z.string().optional().describe('The name of the Connect configuration.'),
    urlToPublishTo: z.string().optional().describe('The HTTPS URL of the webhook listener endpoint.'),
    configurationType: z.string().optional().describe('The type of the configuration. Valid values: custom, customrecipient, salesforce, eOriginal.'),
    allowEnvelopePublish: z.string().optional().describe('Set to "true" to enable the webhook. The default is "false".'),
    enableLog: z.string().optional().describe('Set to "true" to enable Connect logging.'),
    requiresAcknowledgement: z.string().optional().describe('Set to "true" to require event delivery acknowledgements.'),
    allUsers: z.string().optional().describe('Set to "true" to track events for all users.'),
    allUsersExcept: z.string().optional().describe('Set to "true" to exclude the users in userIds.'),
    userIds: z.array(z.string()).optional().describe('Array of user IDs to include or exclude.'),
    groupIds: z.array(z.string()).optional().describe('Array of group IDs to associate with the configuration.'),
    envelopeEvents: z.array(z.string()).optional().describe('Array of envelope-level event statuses that trigger notifications.'),
    recipientEvents: z.array(z.string()).optional().describe('Array of recipient-level event statuses that trigger notifications.'),
    events: z.array(z.string()).optional().describe('Array of event statuses for the JSON SIM event model.'),
    deliveryMode: z.enum(['SIM', 'aggregate']).optional().describe('The delivery mode.'),
    eventData: z
        .object({
            version: z.string().optional(),
            includeData: z.array(z.string()).optional()
        })
        .optional()
        .describe('Event data format configuration.'),
    includeHMAC: z.string().optional().describe('Set to "true" to use HMAC to verify the request.'),
    signMessageWithX509Certificate: z.string().optional().describe('Set to "true" to enable Mutual TLS.'),
    requireMutualTls: z.string().optional().describe('Set to "true" to enable Mutual TLS authentication.'),
    includeDocuments: z.string().optional(),
    includeCertificateOfCompletion: z.string().optional(),
    useSoapInterface: z.string().optional(),
    includeTimeZoneInformation: z.string().optional(),
    includeOAuth: z.string().optional(),
    includeEnvelopeVoidReason: z.string().optional(),
    includeSenderAccountasCustomField: z.string().optional(),
    includeDocumentFields: z.string().optional(),
    includeCertSoapHeader: z.string().optional(),
    pausePublish: z.string().optional(),
    enableOAuthPerConfiguration: z.string().optional(),
    integratorManaged: z.string().optional(),
    password: z.string().optional(),
    userName: z.string().optional(),
    soapNamespace: z.string().optional(),
    externalFolderId: z.string().optional(),
    externalFolderLabel: z.string().optional(),
    salesforceApiVersion: z.string().optional(),
    salesforceAuthcode: z.string().optional(),
    salesforceCallBackUrl: z.string().optional(),
    salesforceDocumentsAsContentFiles: z.string().optional(),
    senderOverride: z.string().optional(),
    senderSelectableItems: z.array(z.string()).optional(),
    oAuthConfiguration: z.record(z.string(), z.unknown()).optional(),
    sfObjects: z.array(z.record(z.string(), z.unknown())).optional()
});

const EventDataSchema = z
    .object({
        version: z.string().optional(),
        includeData: z.array(z.string()).optional()
    })
    .optional();

const ProviderConnectSchema = z
    .object({
        connectId: z.string().optional(),
        configurationType: z.string().optional(),
        name: z.string().optional(),
        urlToPublishTo: z.string().optional(),
        allowEnvelopePublish: z.string().optional(),
        enableLog: z.string().optional(),
        requiresAcknowledgement: z.string().optional(),
        allUsers: z.string().optional(),
        allUsersExcept: z.string().optional(),
        deliveryMode: z.string().optional(),
        includeDocuments: z.string().optional(),
        includeCertificateOfCompletion: z.string().optional(),
        signMessageWithX509Certificate: z.string().optional(),
        useSoapInterface: z.string().optional(),
        includeTimeZoneInformation: z.string().optional(),
        includeOAuth: z.string().optional(),
        includeHMAC: z.string().optional(),
        integratorManaged: z.string().optional(),
        includeEnvelopeVoidReason: z.string().optional(),
        includeSenderAccountasCustomField: z.string().optional(),
        includeCertSoapHeader: z.string().optional(),
        requireMutualTls: z.string().optional(),
        includeDocumentFields: z.string().optional(),
        pausePublish: z.string().optional(),
        enableOAuthPerConfiguration: z.string().optional(),
        soapNamespace: z.string().optional(),
        envelopeEvents: z.array(z.string()).optional(),
        recipientEvents: z.array(z.string()).optional(),
        events: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        groupIds: z.array(z.string()).optional(),
        password: z.string().optional(),
        userName: z.string().optional(),
        externalFolderId: z.string().optional(),
        externalFolderLabel: z.string().optional(),
        salesforceApiVersion: z.string().optional(),
        salesforceAuthcode: z.string().optional(),
        salesforceCallBackUrl: z.string().optional(),
        salesforceDocumentsAsContentFiles: z.string().optional(),
        senderOverride: z.string().optional(),
        senderSelectableItems: z.array(z.string()).optional(),
        eventData: EventDataSchema
    })
    .passthrough();

const OutputSchema = z
    .object({
        connectId: z.string().optional(),
        configurationType: z.string().optional(),
        name: z.string().optional(),
        urlToPublishTo: z.string().optional(),
        allowEnvelopePublish: z.string().optional(),
        enableLog: z.string().optional(),
        requiresAcknowledgement: z.string().optional(),
        allUsers: z.string().optional(),
        allUsersExcept: z.string().optional(),
        deliveryMode: z.string().optional(),
        includeDocuments: z.string().optional(),
        includeCertificateOfCompletion: z.string().optional(),
        signMessageWithX509Certificate: z.string().optional(),
        useSoapInterface: z.string().optional(),
        includeTimeZoneInformation: z.string().optional(),
        includeOAuth: z.string().optional(),
        includeHMAC: z.string().optional(),
        integratorManaged: z.string().optional(),
        includeEnvelopeVoidReason: z.string().optional(),
        includeSenderAccountasCustomField: z.string().optional(),
        includeCertSoapHeader: z.string().optional(),
        requireMutualTls: z.string().optional(),
        includeDocumentFields: z.string().optional(),
        pausePublish: z.string().optional(),
        enableOAuthPerConfiguration: z.string().optional(),
        soapNamespace: z.string().optional(),
        envelopeEvents: z.array(z.string()).optional(),
        recipientEvents: z.array(z.string()).optional(),
        events: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        groupIds: z.array(z.string()).optional(),
        password: z.string().optional(),
        userName: z.string().optional(),
        externalFolderId: z.string().optional(),
        externalFolderLabel: z.string().optional(),
        salesforceApiVersion: z.string().optional(),
        salesforceAuthcode: z.string().optional(),
        salesforceCallBackUrl: z.string().optional(),
        salesforceDocumentsAsContentFiles: z.string().optional(),
        senderOverride: z.string().optional(),
        senderSelectableItems: z.array(z.string()).optional(),
        eventData: EventDataSchema
    })
    .passthrough();

const action = createAction({
    description: 'Update an existing Connect webhook configuration.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    endpoint: {
        method: 'POST',
        path: '/actions/update-connect-configuration'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ accountId?: string }>();
        const accountId = metadata?.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const body: Record<string, unknown> = {
            connectId: input.connectId
        };

        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.urlToPublishTo !== undefined) {
            body['urlToPublishTo'] = input.urlToPublishTo;
        }
        if (input.configurationType !== undefined) {
            body['configurationType'] = input.configurationType;
        }
        if (input.allowEnvelopePublish !== undefined) {
            body['allowEnvelopePublish'] = input.allowEnvelopePublish;
        }
        if (input.enableLog !== undefined) {
            body['enableLog'] = input.enableLog;
        }
        if (input.requiresAcknowledgement !== undefined) {
            body['requiresAcknowledgement'] = input.requiresAcknowledgement;
        }
        if (input.allUsers !== undefined) {
            body['allUsers'] = input.allUsers;
        }
        if (input.allUsersExcept !== undefined) {
            body['allUsersExcept'] = input.allUsersExcept;
        }
        if (input.userIds !== undefined) {
            body['userIds'] = input.userIds;
        }
        if (input.groupIds !== undefined) {
            body['groupIds'] = input.groupIds;
        }
        if (input.envelopeEvents !== undefined) {
            body['envelopeEvents'] = input.envelopeEvents;
        }
        if (input.recipientEvents !== undefined) {
            body['recipientEvents'] = input.recipientEvents;
        }
        if (input.events !== undefined) {
            body['events'] = input.events;
        }
        if (input.deliveryMode !== undefined) {
            body['deliveryMode'] = input.deliveryMode;
        }
        if (input.eventData !== undefined) {
            body['eventData'] = input.eventData;
        }
        if (input.includeHMAC !== undefined) {
            body['includeHMAC'] = input.includeHMAC;
        }
        if (input.signMessageWithX509Certificate !== undefined) {
            body['signMessageWithX509Certificate'] = input.signMessageWithX509Certificate;
        }
        if (input.requireMutualTls !== undefined) {
            body['requireMutualTls'] = input.requireMutualTls;
        }
        if (input.includeDocuments !== undefined) {
            body['includeDocuments'] = input.includeDocuments;
        }
        if (input.includeCertificateOfCompletion !== undefined) {
            body['includeCertificateOfCompletion'] = input.includeCertificateOfCompletion;
        }
        if (input.useSoapInterface !== undefined) {
            body['useSoapInterface'] = input.useSoapInterface;
        }
        if (input.includeTimeZoneInformation !== undefined) {
            body['includeTimeZoneInformation'] = input.includeTimeZoneInformation;
        }
        if (input.includeOAuth !== undefined) {
            body['includeOAuth'] = input.includeOAuth;
        }
        if (input.includeEnvelopeVoidReason !== undefined) {
            body['includeEnvelopeVoidReason'] = input.includeEnvelopeVoidReason;
        }
        if (input.includeSenderAccountasCustomField !== undefined) {
            body['includeSenderAccountasCustomField'] = input.includeSenderAccountasCustomField;
        }
        if (input.includeDocumentFields !== undefined) {
            body['includeDocumentFields'] = input.includeDocumentFields;
        }
        if (input.includeCertSoapHeader !== undefined) {
            body['includeCertSoapHeader'] = input.includeCertSoapHeader;
        }
        if (input.pausePublish !== undefined) {
            body['pausePublish'] = input.pausePublish;
        }
        if (input.enableOAuthPerConfiguration !== undefined) {
            body['enableOAuthPerConfiguration'] = input.enableOAuthPerConfiguration;
        }
        if (input.integratorManaged !== undefined) {
            body['integratorManaged'] = input.integratorManaged;
        }
        if (input.password !== undefined) {
            body['password'] = input.password;
        }
        if (input.userName !== undefined) {
            body['userName'] = input.userName;
        }
        if (input.soapNamespace !== undefined) {
            body['soapNamespace'] = input.soapNamespace;
        }
        if (input.externalFolderId !== undefined) {
            body['externalFolderId'] = input.externalFolderId;
        }
        if (input.externalFolderLabel !== undefined) {
            body['externalFolderLabel'] = input.externalFolderLabel;
        }
        if (input.salesforceApiVersion !== undefined) {
            body['salesforceApiVersion'] = input.salesforceApiVersion;
        }
        if (input.salesforceAuthcode !== undefined) {
            body['salesforceAuthcode'] = input.salesforceAuthcode;
        }
        if (input.salesforceCallBackUrl !== undefined) {
            body['salesforceCallBackUrl'] = input.salesforceCallBackUrl;
        }
        if (input.salesforceDocumentsAsContentFiles !== undefined) {
            body['salesforceDocumentsAsContentFiles'] = input.salesforceDocumentsAsContentFiles;
        }
        if (input.senderOverride !== undefined) {
            body['senderOverride'] = input.senderOverride;
        }
        if (input.senderSelectableItems !== undefined) {
            body['senderSelectableItems'] = input.senderSelectableItems;
        }
        if (input.oAuthConfiguration !== undefined) {
            body['oAuthConfiguration'] = input.oAuthConfiguration;
        }
        if (input.sfObjects !== undefined) {
            body['sfObjects'] = input.sfObjects;
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/connect/connectconfigurations/update/
        const response = await nango.put({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/connect`,
            data: body,
            retries: 3
        });

        const providerConnect = ProviderConnectSchema.parse(response.data);

        return { ...providerConnect };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
