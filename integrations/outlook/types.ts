export interface OutlookMessage {
    id: string;
    from: EmailAddress;
    toRecipients: Recipient[];
    receivedDateTime: string;
    subject: string;
    attachments: Attachment[];
    conversationId: string;
    body: BodyItem;
    isDraft: boolean;
    parentFolderId: string;
    sentDateTime: string;
}

interface EmailAddress {
    address: string;
    name: string;
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

export interface MeMailAddress {
    mail: string;
}

export interface MailFolder {
    id: string;
    displayName: string;
}

export interface MailFolders {
    value: MailFolder[];
}
