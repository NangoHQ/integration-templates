import type { NangoAction, ProxyConfiguration, Metadata } from '../../models';
import type { GoogleMailFile } from '../types';

//Fetch attachment content
export default async function runAction(nango: NangoAction, input: Metadata): Promise<string> {
    const { threadId, attachmentId } = input;

    // https://developers.google.com/gmail/api/reference/rest/v1/users.messages.attachments/get
    const config: ProxyConfiguration = {
        endpoint: `/gmail/v1/users/me/messages/${threadId}/attachments/${attachmentId}`,
        retries: 10
    };

    const attachmentResponse = await nango.get<GoogleMailFile>(config);

    return attachmentResponse.data.data;
}
