import { z } from 'zod';
import { createAction } from 'nango';

// https://developers.docusign.com/platform/webhooks/connect/event-triggers/
const ConnectEventSchema = z.enum([
    'envelope-created',
    'envelope-sent',
    'envelope-resent',
    'envelope-delivered',
    'envelope-completed',
    'envelope-declined',
    'envelope-voided',
    'envelope-corrected',
    'envelope-removed',
    'envelope-purge',
    'envelope-deleted',
    'envelope-discard',
    'envelope-reminder-sent',
    'recipient-sent',
    'recipient-resent',
    'recipient-autoresponded',
    'recipient-delivered',
    'recipient-completed',
    'recipient-declined',
    'recipient-authenticationfailed',
    'recipient-delegate',
    'recipient-reassign',
    'recipient-finish-later',
    'template-created',
    'template-modified',
    'template-deleted',
    'click-agreed',
    'click-declined',
    'sms-opt-in',
    'sms-opt-out',
    'identity-verification-pending',
    'identity-verification-completed',
    'workflow-started',
    'workflow-failed',
    'workflow-completed',
    'extension-executed',
    'notary-session-completed',
    'notary-session-terminated',
    'notary-session-signer-locked',
    'notary-session-signer-unlocked',
    'notary-session-authentication-failed',
    'notary-session-paused',
    'notary-session-status-updated',
    'notary-session-notary-assigned',
    'notary-session-notary-removed',
    'notary-session-ondemand-witness-joined',
    'workspace-upload-request-created',
    'workspace-upload-request-sent',
    'workspace-upload-request-completed'
]);

const IncludeDataSchema = z.enum([
    'attachments',
    'custom_fields',
    'documents',
    'document_fields',
    'extensions',
    'folders',
    'payment_tabs',
    'powerform',
    'prefill_tabs',
    'recipients',
    'tabs',
    'templates'
]);

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Display name for the DocuSign Connect configuration. Example: "Envelope completed webhook"'),
        urlToPublishTo: z
            .string()
            .url()
            .startsWith('https://')
            .describe('HTTPS URL that DocuSign posts event notifications to. Example: "https://example.com/webhooks/docusign"'),
        events: z
            .array(ConnectEventSchema)
            .min(1)
            .describe(
                'Events that trigger the webhook. Common choices: "recipient-delivered" (a recipient opened/viewed the envelope), "recipient-completed" (a recipient signed), "envelope-sent", "envelope-completed" (all recipients finished), "envelope-declined", "envelope-voided". Example: ["recipient-delivered", "envelope-completed"]'
            ),
        includeData: z
            .array(IncludeDataSchema)
            .optional()
            .describe(
                'Extra envelope data to embed in each notification payload. By default only envelope summary data is sent. Example: ["recipients", "custom_fields"]'
            ),
        allUsers: z
            .boolean()
            .optional()
            .describe('When true (default), events from all current and future account users are published. When false, userIds is required.'),
        userIds: z
            .array(z.string())
            .optional()
            .describe('DocuSign user IDs whose envelopes trigger the webhook. Required when allUsers is false, and rejected otherwise.'),
        allowEnvelopePublish: z
            .boolean()
            .optional()
            .describe('When true (default), the configuration is enabled immediately. When false, it is created disabled.'),
        requiresAcknowledgement: z
            .boolean()
            .optional()
            .describe('When true (default), DocuSign expects a 2xx response from urlToPublishTo and retries failed deliveries.'),
        includeHMAC: z
            .boolean()
            .optional()
            .describe(
                'When true, notifications are signed with the account HMAC keys. HMAC keys must already be configured in DocuSign Connect settings. Default false.'
            ),
        includeTimeZoneInformation: z.boolean().optional().describe('When true, notifications include the envelope time zone information. Default false.'),
        includeEnvelopeVoidReason: z.boolean().optional().describe('When true, envelope-voided notifications include the void reason. Default false.'),
        includeCertificateOfCompletion: z
            .boolean()
            .optional()
            .describe('When true, the Certificate of Completion is included with completed envelopes. Default false.'),
        includeDocumentFields: z.boolean().optional().describe('When true, document fields are included in notifications. Default false.'),
        includeSenderAccountasCustomField: z
            .boolean()
            .optional()
            .describe('When true, the sender account is included as a custom field in notifications. Default false.')
    })
    .refine((data) => data.allUsers !== false || (data.userIds !== undefined && data.userIds.length > 0), {
        // DocuSign accepts allUsers=false without userIds, creating a subscription that never fires.
        message: 'userIds must contain at least one user ID when allUsers is false',
        path: ['userIds']
    })
    .refine((data) => data.allUsers === false || data.userIds === undefined, {
        // With allUsers true DocuSign ignores userIds, which would silently widen the subscription to every user.
        message: 'userIds can only be provided when allUsers is false',
        path: ['userIds']
    })
    .describe('Input for creating a DocuSign Connect webhook subscribed to any set of events.');

const MetadataSchema = z.object({
    accountId: z.string().optional().describe('DocuSign account ID stored in connection metadata by the post-connection script.')
});

const ConnectionConfigSchema = z.object({
    accountId: z.string().optional()
});

const ProviderBooleanSchema = z.union([z.string(), z.boolean()]);

const ProviderConnectSchema = z
    .object({
        connectId: z.string(),
        name: z.string().optional(),
        urlToPublishTo: z.string().optional(),
        configurationType: z.string().optional(),
        deliveryMode: z.string().optional(),
        events: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        allUsers: ProviderBooleanSchema.optional(),
        allowEnvelopePublish: ProviderBooleanSchema.optional(),
        requiresAcknowledgement: ProviderBooleanSchema.optional(),
        includeHMAC: ProviderBooleanSchema.optional(),
        eventData: z
            .object({
                version: z.string().optional(),
                includeData: z.array(z.string()).optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        connectId: z.string().describe('DocuSign-generated ID of the created Connect configuration. Example: "22399798"'),
        name: z.string().describe('Name of the created Connect configuration.'),
        urlToPublishTo: z.string().describe('URL that DocuSign publishes event notifications to.'),
        events: z.array(z.string()).describe('Events the webhook is subscribed to.'),
        includeData: z.array(z.string()).describe('Extra envelope data embedded in each notification payload.'),
        configurationType: z.string().optional().describe('Connect configuration scope, for example "custom" for an account-level configuration.'),
        deliveryMode: z.string().optional().describe('Delivery mode used by DocuSign. Always "sim" (one notification per event) for this action.'),
        allUsers: z.boolean().optional().describe('Whether the configuration publishes events for all account users.'),
        userIds: z.array(z.string()).optional().describe('User IDs the configuration is scoped to when allUsers is false.'),
        allowEnvelopePublish: z.boolean().optional().describe('Whether the configuration is enabled to publish events.'),
        requiresAcknowledgement: z.boolean().optional().describe('Whether DocuSign expects a 2xx acknowledgement and retries failed deliveries.'),
        includeHMAC: z.boolean().optional().describe('Whether notifications are HMAC-signed.'),
        eventDataVersion: z.string().optional().describe('Event payload version configured for the webhook. Example: "restv2.1"')
    })
    .describe('Details of the DocuSign Connect webhook configuration that was created.');

function parseProviderBoolean(value: string | boolean | undefined): boolean | undefined {
    if (typeof value === 'boolean') {
        return value;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    return undefined;
}

function toProviderBoolean(value: boolean | undefined, defaultValue: boolean): 'true' | 'false' {
    return (value ?? defaultValue) ? 'true' : 'false';
}

/**
 * @tags: [write]
 * @tagReason: Creates a persistent account-level DocuSign Connect webhook configuration that changes where envelope and recipient events are published.
 * @pitfalls: Repeated calls create separate subscriptions instead of updating an existing one; events go directly to urlToPublishTo (not through Nango) and require a 2xx acknowledgement there; "recipient-delivered" means the recipient opened/viewed the envelope, not that the email was delivered; and DocuSign Connect must be enabled on the account plan.
 */
const action = createAction({
    description: 'Create a DocuSign Connect webhook that publishes JSON notifications for any chosen set of envelope, recipient, template or other events.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        let accountId = metadata.accountId;

        if (!accountId) {
            const connection = await nango.getConnection();
            const connectionConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
            if (connectionConfig.success) {
                accountId = connectionConfig.data.accountId;
            }
        }

        if (!accountId) {
            throw new nango.ActionError({
                type: 'missing_account_id',
                message: 'No accountId was found in connection metadata or connection config.'
            });
        }

        const events = [...new Set(input.events)];
        const includeData = [...new Set(input.includeData ?? [])];
        const allUsers = input.allUsers ?? true;

        // https://developers.docusign.com/docs/esign-rest-api/reference/connect/connectconfigurations/create/
        const response = await nango.post({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/connect`,
            data: {
                configurationType: 'custom',
                // The `events` field is only honoured by the JSON SIM delivery model.
                deliveryMode: 'SIM',
                name: input.name,
                urlToPublishTo: input.urlToPublishTo,
                allUsers: allUsers ? 'true' : 'false',
                ...(!allUsers && { userIds: input.userIds }),
                allowEnvelopePublish: toProviderBoolean(input.allowEnvelopePublish, true),
                enableLog: 'true',
                requiresAcknowledgement: toProviderBoolean(input.requiresAcknowledgement, true),
                includeHMAC: toProviderBoolean(input.includeHMAC, false),
                signMessageWithX509Certificate: 'false',
                includeTimeZoneInformation: toProviderBoolean(input.includeTimeZoneInformation, false),
                includeEnvelopeVoidReason: toProviderBoolean(input.includeEnvelopeVoidReason, false),
                includeCertificateOfCompletion: toProviderBoolean(input.includeCertificateOfCompletion, false),
                includeDocumentFields: toProviderBoolean(input.includeDocumentFields, false),
                includeSenderAccountasCustomField: toProviderBoolean(input.includeSenderAccountasCustomField, false),
                events,
                eventData: {
                    version: 'restv2.1',
                    includeData
                }
            },
            // Creating a webhook subscription is not idempotent; a retry after a lost response could create a duplicate configuration.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const provider = ProviderConnectSchema.parse(response.data);
        const providerAllUsers = parseProviderBoolean(provider.allUsers);
        const allowEnvelopePublish = parseProviderBoolean(provider.allowEnvelopePublish);
        const requiresAcknowledgement = parseProviderBoolean(provider.requiresAcknowledgement);
        const includeHMAC = parseProviderBoolean(provider.includeHMAC);

        return {
            connectId: provider.connectId,
            name: provider.name ?? input.name,
            urlToPublishTo: provider.urlToPublishTo ?? input.urlToPublishTo,
            events: provider.events ?? events,
            includeData: provider.eventData?.includeData ?? includeData,
            ...(provider.configurationType != null && { configurationType: provider.configurationType }),
            ...(provider.deliveryMode != null && { deliveryMode: provider.deliveryMode }),
            ...(providerAllUsers != null && { allUsers: providerAllUsers }),
            ...(provider.userIds != null && provider.userIds.length > 0 && { userIds: provider.userIds }),
            ...(allowEnvelopePublish != null && { allowEnvelopePublish }),
            ...(requiresAcknowledgement != null && { requiresAcknowledgement }),
            ...(includeHMAC != null && { includeHMAC }),
            ...(provider.eventData?.version != null && { eventDataVersion: provider.eventData.version })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
