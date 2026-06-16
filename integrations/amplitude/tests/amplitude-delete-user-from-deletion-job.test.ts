import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-user-from-deletion-job.js';

describe('amplitude delete-user-from-deletion-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-user-from-deletion-job',
        Model: 'ActionOutput_amplitude_deleteuserfromdeletionjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
