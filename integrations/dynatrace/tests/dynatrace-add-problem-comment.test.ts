import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-problem-comment.js';

describe('dynatrace add-problem-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-problem-comment',
        Model: 'ActionOutput_dynatrace_addproblemcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
