import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-background-job.js';

describe('instantly get-background-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-background-job',
        Model: 'ActionOutput_instantly_getbackgroundjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
