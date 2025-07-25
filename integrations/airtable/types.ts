import type { Webhook } from '../models.js';

export interface AirtableTableView {
    id: string;
    name: string;
    type: string;
}
export interface AirtableTableField {
    id: string;
    description: string;
    name: string;
    type: string;
    options?: Record<string, any>;
}

export interface AirtableTable {
    id: string;
    name: string;
    views: AirtableTableView[];
    fields: AirtableTableField[];
    primaryFieldId: string;
}

export interface AirtableWebhookCreatedResponse {
    expirationTime: string;
    id: string;
    macSecretBase64: string;
}

export interface AirtableWebhook extends Webhook {
    notificationUrl: string | null;
}

export interface AirtableWebhookResponse {
    webhooks: AirtableWebhook[];
}

export interface AirtableWhoAmIResponse {
    id: string;
    email?: string;
    scopes?: string[];
}
