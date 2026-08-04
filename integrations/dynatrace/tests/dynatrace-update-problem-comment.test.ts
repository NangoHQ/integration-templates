import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-problem-comment.js';

describe('dynatrace update-problem-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-problem-comment',
        Model: 'ActionOutput_dynatrace_updateproblemcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
