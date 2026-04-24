import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-issue-label.js';

describe('linear create-issue-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-issue-label',
        Model: 'ActionOutput_linear_createissuelabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
