import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-issue-label.js';

describe('linear add-issue-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-issue-label',
        Model: 'ActionOutput_linear_addissuelabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
