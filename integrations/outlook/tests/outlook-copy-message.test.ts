import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/copy-message.js';

describe('outlook copy-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'copy-message',
        Model: 'ActionOutput_outlook_copymessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('does not retry message copy creation', async () => {
        const postMock = vi.fn().mockResolvedValue({ data: { id: 'copy-1' } });
        const fakeNango = { post: postMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, { messageId: 'message-1', destinationId: 'folder-1' });

        expect(postMock).toHaveBeenCalledWith(expect.objectContaining({ retries: 0 }));
    });
});
