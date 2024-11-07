import type { NangoAction, ProxyConfiguration, DocumentInput } from '../../models';
import type { GoogleMailFile } from '../types';

//Fetch attachment content
export default async function runAction(nango: NangoAction, input: DocumentInput): Promise<string> {
    const { threadId, attachmentId } = input;

    const config: ProxyConfiguration = {
        // https://developers.google.com/gmail/api/reference/rest/v1/users.messages.attachments/get
        endpoint: `/gmail/v1/users/me/messages/${threadId}/attachments/${attachmentId}`,
        retries: 10
    };

    const attachmentResponse = await nango.get<GoogleMailFile>(config);

    return attachmentResponse.data.data;
}
