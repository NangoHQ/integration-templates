import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-issue-label.js';

describe('linear remove-issue-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-issue-label',
        Model: 'ActionOutput_linear_removeissuelabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
