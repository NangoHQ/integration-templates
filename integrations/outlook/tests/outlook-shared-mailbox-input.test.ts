import { expect, it, describe } from 'vitest';

import addMessageAttachment from '../actions/add-message-attachment.js';
import copyMessage from '../actions/copy-message.js';
import createDraftMessage from '../actions/create-draft-message.js';
import createMailFolder from '../actions/create-mail-folder.js';
import deleteMessage from '../actions/delete-message.js';
import downloadMessageAttachment from '../actions/download-message-attachment.js';
import getMessage from '../actions/get-message.js';
import listMailFolderChildren from '../actions/list-mail-folder-children.js';
import listMailFolders from '../actions/list-mail-folders.js';
import listMessageAttachments from '../actions/list-message-attachments.js';
import listMessages from '../actions/list-messages.js';
import moveMessage from '../actions/move-message.js';
import replyAllToMessage from '../actions/reply-all-to-message.js';
import replyToMessage from '../actions/reply-to-message.js';
import sendDraftMessage from '../actions/send-draft-message.js';
import sendMail from '../actions/send-mail.js';
import updateMessage from '../actions/update-message.js';

const sharedMailboxInputs = [
    ['add-message-attachment', addMessageAttachment.input.shape.sharedMailbox],
    ['copy-message', copyMessage.input.shape.sharedMailbox],
    ['create-draft-message', createDraftMessage.input.shape.sharedMailbox],
    ['create-mail-folder', createMailFolder.input.shape.sharedMailbox],
    ['delete-message', deleteMessage.input.shape.sharedMailbox],
    ['download-message-attachment', downloadMessageAttachment.input.shape.sharedMailbox],
    ['get-message', getMessage.input.shape.sharedMailbox],
    ['list-mail-folder-children', listMailFolderChildren.input.shape.sharedMailbox],
    ['list-mail-folders', listMailFolders.input.shape.sharedMailbox],
    ['list-message-attachments', listMessageAttachments.input.shape.sharedMailbox],
    ['list-messages', listMessages.input.shape.sharedMailbox],
    ['move-message', moveMessage.input.shape.sharedMailbox],
    ['reply-all-to-message', replyAllToMessage.input.shape.sharedMailbox],
    ['reply-to-message', replyToMessage.input.shape.sharedMailbox],
    ['send-draft-message', sendDraftMessage.input.shape.sharedMailbox],
    ['send-mail', sendMail.input.shape.sharedMailbox],
    ['update-message', updateMessage.input.shape.sharedMailbox]
] as const;

describe('Outlook shared-mailbox input schemas', () => {
    it.each(sharedMailboxInputs)('%s rejects blank mailbox identifiers', (_name, schema) => {
        expect(schema.safeParse(' \t\n').success).toBe(false);
    });

    it.each(sharedMailboxInputs)('%s trims surrounding whitespace', (_name, schema) => {
        expect(schema.parse('  00000000-0000-0000-0000-000000000001  ')).toBe('00000000-0000-0000-0000-000000000001');
    });
});
