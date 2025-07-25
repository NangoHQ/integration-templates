import type { NangoSync, ProxyConfiguration, GmailLabel } from '../../models.js';
import type { GoogleMailLabel } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://developers.google.com/gmail/api/reference/rest/v1/users.labels/list
        endpoint: `/gmail/v1/users/me/labels`,
        method: 'get',
        retries: 10
    };

    const response = await nango.proxy(config);

    const labels: GmailLabel[] = response.data.labels.map((label: GoogleMailLabel) => {
        return {
            id: label.id,
            name: label.name,
            messageListVisibility: label.messageListVisibility,
            labelListVisibility: label.labelListVisibility,
            type: label.type,
            messagesTotal: label.messagesTotal,
            messagesUnread: label.messagesUnread,
            threadsTotal: label.threadsTotal,
            threadsUnread: label.threadsUnread,
            color: label.color ?? null
        };
    });

    await nango.batchSave(labels, 'GmailLabel');
}
