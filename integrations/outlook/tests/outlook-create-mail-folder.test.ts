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
});
