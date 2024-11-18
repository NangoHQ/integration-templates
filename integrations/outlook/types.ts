export interface OutlookMessage {
    id: string;
    from: Recipient;
    toRecipients: Recipient[];
    receivedDateTime: string;
    subject: string;
    attachments: Attachment[];
    conversationId: string;
    body: BodyItem;
}

interface EmailAddress {
    address: string;
}
interface BodyItem {
    content: string;
    contentType: string;
}
export interface Attachment {
    contentType: string;
    id: string;
    isInline: boolean;
    lastModifiedDateTime: string;
    name: string;
    size: number;
}

export interface Recipient {
    emailAddress: EmailAddress;
}
