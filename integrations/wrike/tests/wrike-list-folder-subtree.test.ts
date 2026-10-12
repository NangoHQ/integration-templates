import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-folder-subtree.js';

describe('wrike list-folder-subtree tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-folder-subtree',
        Model: 'ActionOutput_wrike_listfoldersubtree'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
