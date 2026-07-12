import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-linked-file.js';

describe('shortcut create-linked-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-linked-file',
        Model: 'ActionOutput_shortcut_createlinkedfile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
