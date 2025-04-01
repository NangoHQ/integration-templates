export interface OutlookMessage {
    id: string;
    from: EmailContact;
    toRecipients: EmailContact[];
    receivedDateTime: string;
    subject: string;
    hasAttachments: boolean;
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
    name: string;
    size: number;
}

export interface EmailContact {
    emailAddress: EmailAddress;
}

export interface OutlookFolderResponse {
    id: string;
    displayName: string;
    parentFolderId: string;
    childFolderCount: number;
    unreadItemCount: number;
    totalItemCount: number;
    isHidden: boolean;
}
