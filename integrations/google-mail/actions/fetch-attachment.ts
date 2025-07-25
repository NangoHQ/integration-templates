import type { NangoAction, ProxyConfiguration, DocumentInput } from '../../models.js';
import type { GoogleMailFile } from '../types.js';

//Fetch attachment content
export default async function runAction(nango: NangoAction, input: DocumentInput): Promise<string> {
    const { threadId, attachmentId } = input;

    const config: ProxyConfiguration = {
        // https://developers.google.com/gmail/api/reference/rest/v1/users.messages.attachments/get
        endpoint: `/gmail/v1/users/me/messages/${threadId}/attachments/${attachmentId}`,
        retries: 3
    };

    const attachmentResponse = await nango.get<GoogleMailFile>(config);

    return attachmentResponse.data.data;
}
