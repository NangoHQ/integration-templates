import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-branch.js';

describe('gitlab get-branch tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-branch',
        Model: 'ActionOutput_gitlab_getbranch'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
