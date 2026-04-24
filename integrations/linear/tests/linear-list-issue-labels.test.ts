import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-issue-labels.js';

describe('linear list-issue-labels tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-issue-labels',
        Model: 'ActionOutput_linear_listissuelabels'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
