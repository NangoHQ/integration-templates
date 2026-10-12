import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-mail-folder.js';

describe('outlook create-mail-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-mail-folder',
        Model: 'ActionOutput_outlook_createmailfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('routes shared-mailbox folder creation without retries', async () => {
        const postMock = vi.fn().mockResolvedValue({ data: { id: 'folder-1', displayName: 'Work' } });
        const fakeNango = { post: postMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, {
            sharedMailbox: 'office@example.com',
            parentFolderId: 'inbox',
            displayName: 'Work'
        });

        expect(postMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/office%40example.com/mailFolders/inbox/childFolders',
            retries: 0
        }));
    });
});
