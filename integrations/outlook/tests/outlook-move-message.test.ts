import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-message.js';

describe('outlook move-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-message',
        Model: 'ActionOutput_outlook_movemessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('does not retry moving a message', async () => {
        const postMock = vi.fn().mockResolvedValue({ data: { id: 'message-1', parentFolderId: 'folder-1' } });
        const fakeNango = { post: postMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, { messageId: 'message-1', destinationId: 'folder-1' });

        expect(postMock).toHaveBeenCalledWith(expect.objectContaining({ retries: 0 }));
    });
});
