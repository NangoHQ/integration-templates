import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-issue-label.js';

describe('linear get-issue-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-issue-label',
        Model: 'ActionOutput_linear_getissuelabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
