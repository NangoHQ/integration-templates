import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-branch.js';

describe('gitlab create-branch tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-branch',
        Model: 'ActionOutput_gitlab_createbranch'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
