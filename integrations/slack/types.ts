interface SlackMessageAttachment {
    text: string;
    id: number;
    fallback: string;
}

interface SlackBotProfile {
    id: string;
    app_id: string;
    name: string;
    icons: {
        image_36: string;
        image_48: string;
        image_72: string;
    };
    deleted: boolean;
    updated: number;
    team_id: string;
}

interface SlackMessageBlock {
    type: string;
    block_id: string;
    elements: {
        type: string;
        elements: {
            type: string;
            text?: string;
        }[];
    }[];
}

interface SlackMessage {
    text: string;
    username?: string;
    bot_id?: string;
    attachments?: SlackMessageAttachment[];
    type: string;
    subtype?: string;
    ts: string;
    user?: string;
    app_id?: string;
    team?: string;
    bot_profile?: SlackBotProfile;
    blocks?: SlackMessageBlock[];
}

export interface SlackSuccessResponse {
    ok: true;
    channel: string;
    ts: string;
    message: SlackMessage;
    warning?: string;
    response_metadata?: {
        warnings?: string[];
    };
}

interface SlackErrorResponse {
    ok: false;
    error: string;
}

export type SlackResponse = SlackSuccessResponse | SlackErrorResponse;
