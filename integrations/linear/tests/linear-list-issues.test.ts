import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-issues.js';

describe('linear list-issues tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-issues',
        Model: 'ActionOutput_linear_listissues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
