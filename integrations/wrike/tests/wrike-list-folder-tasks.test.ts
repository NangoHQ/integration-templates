import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-folder-tasks.js';

describe('wrike list-folder-tasks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-folder-tasks',
        Model: 'ActionOutput_wrike_listfoldertasks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
