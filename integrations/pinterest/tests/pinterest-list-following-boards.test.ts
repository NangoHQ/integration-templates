import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-following-boards.js';

describe('pinterest list-following-boards tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-following-boards',
        Model: 'ActionOutput_pinterest_listfollowingboards'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
