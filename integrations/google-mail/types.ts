// All types copied from
// https://github.com/googleapis/google-api-nodejs-client/blob/main/src/apis/gmail/v1.ts
// NB: they set `? | null` for all fields which is not true

/**
 * An email message.
 */
export interface Schema$Message {
    /**
     * The ID of the last history record that modified this message.
     */
    historyId?: string | null;
    /**
     * The immutable ID of the message.
     */
    id: string;
    /**
     * The internal message creation timestamp (epoch ms), which determines ordering in the inbox. For normal SMTP-received email, this represents the time the message was originally accepted by Google, which is more reliable than the `Date` header. However, for API-migrated mail, it can be configured by client to be based on the `Date` header.
     */
    internalDate: string;
    /**
     * List of IDs of labels applied to this message.
     */
    labelIds?: string[] | null;
    /**
     * The parsed email structure in the message parts.
     */
    payload?: Schema$MessagePart;
    /**
     * The entire email message in an RFC 2822 formatted and base64url encoded string. Returned in `messages.get` and `drafts.get` responses when the `format=RAW` parameter is supplied.
     */
    raw?: string | null;
    /**
     * Estimated size in bytes of the message.
     */
    sizeEstimate?: number | null;
    /**
     * A short part of the message text.
     */
    snippet?: string | null;
    /**
     * The ID of the thread the message belongs to. To add a message or draft to a thread, the following criteria must be met: 1. The requested `threadId` must be specified on the `Message` or `Draft.Message` you supply with your request. 2. The `References` and `In-Reply-To` headers must be set in compliance with the [RFC 2822](https://tools.ietf.org/html/rfc2822) standard. 3. The `Subject` headers must match.
     */
    threadId: string;
}

/**
 * A single MIME message part.
 */
export interface Schema$MessagePart {
    /**
     * The message part body for this part, which may be empty for container MIME message parts.
     */
    body?: Schema$MessagePartBody;
    /**
     * The filename of the attachment. Only present if this message part represents an attachment.
     */
    filename?: string | null;
    /**
     * List of headers on this message part. For the top-level message part, representing the entire message payload, it will contain the standard RFC 2822 email headers such as `To`, `From`, and `Subject`.
     */
    headers?: Schema$MessagePartHeader[];
    /**
     * The MIME type of the message part.
     */
    mimeType?: string | null;
    /**
     * The immutable ID of the message part.
     */
    partId?: string | null;
    /**
     * The child MIME message parts of this part. This only applies to container MIME message parts, for example `multipart/x`. For non- container MIME message part types, such as `text/plain`, this field is empty. For more information, see RFC 1521.
     */
    parts?: Schema$MessagePart[];
}

/**
 * The body of a single MIME message part.
 */
export interface Schema$MessagePartBody {
    /**
     * When present, contains the ID of an external attachment that can be retrieved in a separate `messages.attachments.get` request. When not present, the entire content of the message part body is contained in the data field.
     */
    attachmentId?: string | null;
    /**
     * The body data of a MIME message part as a base64url encoded string. May be empty for MIME container types that have no message body or when the body data is sent as a separate attachment. An attachment ID is present if the body data is contained in a separate attachment.
     */
    data?: string | null;
    /**
     * Number of bytes for the message part data (encoding notwithstanding).
     */
    size?: number | null;
}

export interface Schema$MessagePartHeader {
    /**
     * The name of the header before the `:` separator. For example, `To`.
     */
    name?: string | null;
    /**
     * The value of the header after the `:` separator. For example, `someuser@example.com`.
     */
    value?: string | null;
}


export interface GoogleMailFile  {
    size: number;
    data: string;
}