import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Display name for the DocuSign Connect configuration. Example: "Document opened trigger"'),
        urlToPublishTo: z
            .string()
            .url()
            .startsWith('https://')
            .describe('HTTPS URL that DocuSign posts recipient-open events to. Example: "https://example.com/webhooks/docusign"'),
        allowEnvelopePublish: z
            .boolean()
            .optional()
            .describe(
                'When true (default), the configuration is enabled immediately. When false, DocuSign creates it disabled until it is enabled in the Connect console.'
            ),
        includeHMAC: z
            .boolean()
            .optional()
            .describe(
                'When true, notifications are signed with the account HMAC keys so the receiver can verify them. HMAC keys must already be configured in DocuSign Connect settings. Default false.'
            )
    })
    .describe('Input for creating a DocuSign Connect webhook that fires when a recipient opens or views an envelope document.');

const MetadataSchema = z.object({
    accountId: z.string().optional().describe('DocuSign account ID stored in connection metadata by the post-connection script.')
});

const ConnectionConfigSchema = z.object({
    accountId: z.string().optional()
});

const ConnectEventDataSchema = z
    .object({
        version: z.string().optional(),
        includeData: z.array(z.string()).optional()
    })
    .passthrough();

const ProviderConnectSchema = z
    .object({
        connectId: z.string(),
        name: z.string().optional(),
        urlToPublishTo: z.string().optional(),
        configurationType: z.string().optional(),
        deliveryMode: z.string().optional(),
        recipientEvents: z.array(z.string()).optional(),
        envelopeEvents: z.array(z.string()).optional(),
        allUsers: z.union([z.string(), z.boolean()]).optional(),
        allowEnvelopePublish: z.union([z.string(), z.boolean()]).optional(),
        eventData: ConnectEventDataSchema.optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        connectId: z.string().describe('DocuSign-generated ID of the created Connect configuration. Example: "22399727"'),
        name: z.string().describe('Name of the created Connect configuration.'),
        urlToPublishTo: z.string().describe('URL that DocuSign publishes document-open events to.'),
        configurationType: z.string().optional().describe('Connect configuration scope, for example "custom" for an account-level configuration.'),
        deliveryMode: z.string().optional().describe('Delivery mode used by DocuSign, for example "aggregate".'),
        recipientEvents: z.array(z.string()).describe('Recipient event statuses that trigger the webhook. This action fixes them to ["Delivered"].'),
        envelopeEvents: z.array(z.string()).describe('Envelope event statuses that trigger the webhook. This action fixes them to an empty array.'),
        allUsers: z.boolean().optional().describe('Whether the configuration publishes events for all account users.'),
        allowEnvelopePublish: z.boolean().optional().describe('Whether the configuration is enabled to publish events.'),
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

/**
 * @tags: [write]
 * @tagReason: Creates a persistent account-level DocuSign Connect webhook configuration that changes where envelope and recipient events are published.
 * @pitfalls: Repeated calls create separate subscriptions instead of updating an existing one; events go directly to urlToPublishTo (not through Nango) and require a 2xx acknowledgement there; and the "Delivered" event means the recipient opened/viewed the document, not that the email was delivered.
 */
const action = createAction({
    description:
        'Configure a DocuSign Connect webhook that fires when any recipient opens or views a document, without needing to know the underlying "Delivered" event name.',
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

        // https://developers.docusign.com/docs/esign-rest-api/reference/connect/connectconfigurations/create/
        const response = await nango.post({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/connect`,
            data: {
                configurationType: 'custom',
                deliveryMode: 'Aggregate',
                name: input.name,
                urlToPublishTo: input.urlToPublishTo,
                // Always publish for all users: this action has no userIds input, and allUsers=false without userIds never fires.
                allUsers: 'true',
                allowEnvelopePublish: input.allowEnvelopePublish === false ? 'false' : 'true',
                enableLog: 'true',
                includeHMAC: input.includeHMAC === true ? 'true' : 'false',
                requiresAcknowledgement: 'true',
                signMessageWithX509Certificate: 'false',
                recipientEvents: ['Delivered'],
                envelopeEvents: [],
                eventData: {
                    version: 'restv2.1'
                }
            },
            // Creating a webhook subscription is not idempotent; a retry after a lost response could create a duplicate configuration.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const provider = ProviderConnectSchema.parse(response.data);
        const allUsers = parseProviderBoolean(provider.allUsers);
        const allowEnvelopePublish = parseProviderBoolean(provider.allowEnvelopePublish);

        return {
            connectId: provider.connectId,
            name: provider.name ?? input.name,
            urlToPublishTo: provider.urlToPublishTo ?? input.urlToPublishTo,
            recipientEvents: provider.recipientEvents ?? ['Delivered'],
            envelopeEvents: provider.envelopeEvents ?? [],
            ...(provider.configurationType != null && { configurationType: provider.configurationType }),
            ...(provider.deliveryMode != null && { deliveryMode: provider.deliveryMode }),
            ...(allUsers != null && { allUsers }),
            ...(allowEnvelopePublish != null && { allowEnvelopePublish }),
            ...(provider.eventData?.version != null && { eventDataVersion: provider.eventData.version })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
