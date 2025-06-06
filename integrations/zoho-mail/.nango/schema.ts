// ---------------------------
// This file was generated by Nango (v0.58.7)
// You can version this file
// ---------------------------

export interface ZohoMailTask {
    id: string;
    serviceType: number;
    modifiedTime: Date;
    resourceId: string;
    attachments: any[];
    statusStr: string;
    statusValue: number;
    description: string;
    project: { name: string; id: string };
    isTaskPublished: boolean;
    title: string;
    createdAt: Date;
    portalId: number;
    serviceId: string;
    owner: { name: string; id: number };
    assigneeList: string[];
    dependency: any[];
    subtasks: any[];
    priority: string;
    tags: string[];
    followers: string[];
    namespaceId: string;
    dependents: string[];
    assignee: { name: string; id: number };
    serviceUniqId: number;
    depUniqId: string;
    status: string;
}

export interface ZohoMailEmail {
    id: string;
    summary: string;
    sentDateInGMT: string;
    calendarType: number;
    subject: string;
    messageId: string;
    flagid: string;
    status2: string;
    priority: string;
    hasInline: string;
    toAddress: string;
    folderId: string;
    ccAddress: string;
    hasAttachment: string;
    size: string;
    sender: string;
    receivedTime: string;
    fromAddress: string;
    status: string;
}

export interface ZohoMailSendEmailInput {
    accountId: string;
    fromAddress: string;
    toAddress: string;
    ccAddress: string;
    bccAddress: string;
    subject: string;
    encoding: string;
    mailFormat: string;
    askReceipt: string;
}

export interface ZohoMailSendEmailOutput {
    status: Record<string, any>;
    data: Record<string, any>;
}

export interface ZohoMailAddUserInput {
    zoid: number;
    primaryEmailAddress: string;
    password: string;
    displayName: string;
    role: string;
    country: string;
    language: string;
    timeZone: string;
    oneTimePassword: boolean;
    groupMailList: string[];
}

export interface ZohoMailAddUserOutput {
    status: Record<string, any>;
    data: Record<string, any>;
}
