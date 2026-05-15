import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-notes.js';

describe('pipedrive list-notes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-notes',
        Model: 'ActionOutput_pipedrive_listnotes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
