import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-mail-folders.js';

describe('outlook list-mail-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-mail-folders',
        Model: 'ActionOutput_outlook_listmailfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
