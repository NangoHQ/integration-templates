import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-problem-comments.js';

describe('dynatrace list-problem-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-problem-comments',
        Model: 'ActionOutput_dynatrace_listproblemcomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
