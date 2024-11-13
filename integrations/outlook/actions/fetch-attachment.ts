import type { NangoAction, ProxyConfiguration, DocumentInput } from '../../models';

export default async function runAction(nango: NangoAction, input: DocumentInput): Promise<string> {
    const { threadId, attachmentId } = input;

    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/attachment-get?view=graph-rest-1.0&tabs=http#http-request
        endpoint: `/v1.0/me/messages/${threadId}/attachments/${attachmentId}/$value`,
        retries: 10
    };

    const attachmentResponse = await nango.get(config);

    return attachmentResponse.data;
}
