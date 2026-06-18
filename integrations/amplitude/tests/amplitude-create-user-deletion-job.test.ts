import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-user-deletion-job.js';

describe('amplitude create-user-deletion-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-user-deletion-job',
        Model: 'ActionOutput_amplitude_createuserdeletionjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
