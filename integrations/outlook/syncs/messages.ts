import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider: Microsoft Graph API
// Docs: https://learn.microsoft.com/graph/api/message-delta

const DEFAULT_BACKFILL_MS = 30 * 24 * 60 * 60 * 1000;

const MessageSchema = z.object({
    id: z.string(),
    folderId: z.string(),
    subject: z.string().optional(),
    bodyPreview: z.string().optional(),
    importance: z.string().optional(),
    conversationId: z.string().optional(),
    receivedDateTime: z.string().optional(),
    sentDateTime: z.string().optional(),
    isRead: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    internetMessageId: z.string().optional(),
    sender: z
        .object({
            emailAddress: z
                .object({
                    name: z.string().optional(),
                    address: z.string().optional()
                })
                .optional()
        })
        .optional(),
    from: z
        .object({
            emailAddress: z
                .object({
                    name: z.string().optional(),
                    address: z.string().optional()
                })
                .optional()
        })
        .optional(),
    toRecipients: z
        .array(
            z.object({
                emailAddress: z
                    .object({
                        name: z.string().optional(),
                        address: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional(),
    webLink: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const CheckpointSchema = z.object({
    folderId: z.string(),
    cursorUrl: z.string()
});

const MetadataSchema = z.object({
    folderId: z.string().optional(),
    backfillPeriodMs: z.number().int().positive().optional()
});

const DeltaMessageSchema = z.object({
    id: z.string(),
    '@removed': z.object({ reason: z.string() }).optional(),
    subject: z.string().optional(),
    bodyPreview: z.string().optional(),
    importance: z.string().optional(),
    conversationId: z.string().optional(),
    receivedDateTime: z.string().optional(),
    sentDateTime: z.string().optional(),
    isRead: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    internetMessageId: z.string().optional(),
    sender: z
        .object({
            emailAddress: z
                .object({
                    name: z.string().optional(),
                    address: z.string().optional()
                })
                .optional()
        })
        .optional(),
    from: z
        .object({
            emailAddress: z
                .object({
                    name: z.string().optional(),
                    address: z.string().optional()
                })
                .optional()
        })
        .optional(),
    toRecipients: z
        .array(
            z.object({
                emailAddress: z
                    .object({
                        name: z.string().optional(),
                        address: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional(),
    webLink: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const DeltaPageSchema = z.object({
    value: z.array(DeltaMessageSchema).default([]),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

type Message = z.infer<typeof MessageSchema>;
type Checkpoint = z.infer<typeof CheckpointSchema>;
type DeltaMessage = z.infer<typeof DeltaMessageSchema>;

function toMessage(message: DeltaMessage, folderId: string): Message {
    return {
        id: message.id,
        folderId,
        subject: message.subject,
        bodyPreview: message.bodyPreview,
        importance: message.importance,
        conversationId: message.conversationId,
        receivedDateTime: message.receivedDateTime,
        sentDateTime: message.sentDateTime,
        isRead: message.isRead,
        isDraft: message.isDraft,
        internetMessageId: message.internetMessageId,
        sender: message.sender,
        from: message.from,
        toRecipients: message.toRecipients,
        webLink: message.webLink,
        createdDateTime: message.createdDateTime,
        lastModifiedDateTime: message.lastModifiedDateTime
    };
}

const sync = createSync<{ Message: typeof MessageSchema }, typeof MetadataSchema, typeof CheckpointSchema>({
    description: 'Sync folder-scoped messages with delta tokens',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/messages',
            method: 'POST'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Message: MessageSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const metadata = MetadataSchema.parse(connection.metadata ?? {});
        const folderId = metadata.folderId ?? 'inbox';
        const backfillMs = metadata.backfillPeriodMs ?? DEFAULT_BACKFILL_MS;
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { folderId: '', cursorUrl: '' });
        const effectiveCheckpoint: Checkpoint | undefined = checkpoint?.folderId === folderId ? checkpoint : undefined;
        const hasSavedUrl = Boolean(effectiveCheckpoint?.cursorUrl);
        const timeMin = new Date(Date.now() - backfillMs).toISOString();

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/message-delta
            endpoint: effectiveCheckpoint?.cursorUrl || `/v1.0/me/mailFolders/${encodeURIComponent(folderId)}/messages/delta`,
            ...(hasSavedUrl
                ? {}
                : {
                      params: {
                          $filter: `receivedDateTime ge ${timeMin}`,
                          $orderby: 'receivedDateTime desc'
                      }
                  }),
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink',
                limit: 50,
                limit_name_in_request: '$top'
            },
            retries: 3
        };

        for await (const rawPage of nango.paginate<any>(config)) {
            const page = DeltaPageSchema.parse(rawPage);
            const upserts: Message[] = [];
            const deletions: Array<{ id: string }> = [];

            for (const message of Array.isArray(page.value) ? page.value : []) {
                if (message['@removed']) {
                    deletions.push({ id: message.id });
                } else {
                    upserts.push(toMessage(message, folderId));
                }
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'Message');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Message');
            }

            const cursorUrl = page['@odata.nextLink'] ?? page['@odata.deltaLink'];

            if (cursorUrl) {
                await nango.saveCheckpoint({ folderId, cursorUrl });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
