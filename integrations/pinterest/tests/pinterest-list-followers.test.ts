import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-followers.js';

describe('pinterest list-followers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-followers',
        Model: 'ActionOutput_pinterest_listfollowers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
