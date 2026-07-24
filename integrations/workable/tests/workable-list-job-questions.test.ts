import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-job-questions.js';

describe('workable list-job-questions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-job-questions',
        Model: 'ActionOutput_workable_listjobquestions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
