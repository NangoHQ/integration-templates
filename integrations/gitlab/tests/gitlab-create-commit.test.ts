import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-commit.js';

describe('gitlab create-commit tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-commit',
        Model: 'ActionOutput_gitlab_createcommit'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
