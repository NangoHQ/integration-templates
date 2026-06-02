import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-job.js';

describe('gitlab get-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-job',
        Model: 'ActionOutput_gitlab_getjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
