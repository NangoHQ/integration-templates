import type { NangoSync, OutlookEmail, OptionalBackfillSetting, Attachments, ProxyConfiguration } from '../../models';
import type { OutlookMessage, Attachment, MeMailAddress, MailFolders, MailFolder } from '../types';

// 1 year ago
const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;

export default async function fetchData(nango: NangoSync) {
    const meConfig: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0&tabs=http
        endpoint: '/v1.0/me',
        retries: 10,
        params: {
            $select: 'mail'
        }
    };
    const meResponse = await nango.get<MeMailAddress>(meConfig);

    // Extract the email from the response
    const userEmail = meResponse.data.mail;

    const pageSize = 100;
    const mailFoldersConfig: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/user-list-mailfolders?view=graph-rest-1.0&tabs=http
        endpoint: '/v1.0/me/mailFolders',
        params: {
            $select: 'id,displayName',
            includeHiddenFolders: 'true',
            $filter: 'displayName eq "Archive" or displayName eq "Deleted Items"'
        },
        retries: 10
    };
    const mailFoldersResponse = await nango.get<MailFolders>(mailFoldersConfig);

    const archiveFolderId = mailFoldersResponse.data.value.find((folder: MailFolder) => folder.displayName === 'Archive')?.id;
    const deletedItemsFolderId = mailFoldersResponse.data.value.find((folder: MailFolder) => folder.displayName === 'Deleted Items')?.id;

    const metadata = await nango.getMetadata<OptionalBackfillSetting>();
    const backfillMilliseconds = metadata?.backfillPeriodMs || DEFAULT_BACKFILL_MS;
    const backfillPeriod = new Date(Date.now() - backfillMilliseconds);
    const { lastSyncDate } = nango;
    const syncDate = lastSyncDate || backfillPeriod;

    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0&tabs=http#example-1-list-all-messages
        endpoint: '/v1.0/me/messages',
        params: {
            $filter: `receivedDateTime ge ${syncDate.toISOString()}`,
            $select: 'id,from,toRecipients,receivedDateTime,subject,attachments,conversationId,body,isDraft,parentFolderId,sentDateTime'
        },
        headers: {
            Prefer: 'outlook.body-content-type="text"'
        },
        paginate: {
            type: 'link',
            limit_name_in_request: '$top',
            response_path: 'value',
            link_path_in_response_body: '@odata.nextLink',
            limit: pageSize
        },
        retries: 10
    };

    for await (const messageList of nango.paginate<OutlookMessage>(config)) {
        const emails: OutlookEmail[] = messageList.map((message: OutlookMessage) => {
            const headers = extractHeaders(message);
            return mapEmail(message, headers, userEmail, archiveFolderId, deletedItemsFolderId);
        });

        await nango.batchSave(emails, 'OutlookEmail');
    }
}

function extractHeaders(message: OutlookMessage): Record<string, any> {
    return {
        From: message.from?.address,
        To: message.toRecipients?.map((recipient) => recipient.emailAddress.address).join(', '),
        Subject: message.subject
    };
}

function processParts(attachments: Attachment[]): Attachments[] {
    return attachments.map((attachment) => ({
        attachmentId: attachment.id,
        mimeType: attachment.contentType,
        filename: attachment.name,
        size: attachment.size
    }));
}

function mapEmail(
    messageDetail: OutlookMessage,
    headers: Record<string, any>,
    userEmail: string,
    archiveFolderId: string | undefined,
    deletedItemsFolderId: string | undefined
): OutlookEmail {
    const bodyObj = { body: messageDetail.body?.content || '' };
    const attachments: Attachments[] = messageDetail.attachments ? processParts(messageDetail.attachments) : [];

    return {
        id: messageDetail.id,
        sender: headers['From'],
        recipients: headers['To'],
        date: new Date(messageDetail.receivedDateTime).toISOString(),
        subject: headers['Subject'],
        body: bodyObj.body,
        attachments,
        threadId: messageDetail.conversationId,
        draft: messageDetail.isDraft,
        isSent: messageDetail.from.address === userEmail,
        archived: archiveFolderId ? messageDetail.parentFolderId === archiveFolderId : null,
        deleted: deletedItemsFolderId ? messageDetail.parentFolderId === deletedItemsFolderId : null,
        sent_at: new Date(messageDetail.sentDateTime).toISOString()
    };
}
