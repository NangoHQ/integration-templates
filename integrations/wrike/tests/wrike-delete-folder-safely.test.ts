import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-folder-safely.js';

describe('wrike delete-folder-safely tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-folder-safely',
        Model: 'ActionOutput_wrike_deletefoldersafely'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
