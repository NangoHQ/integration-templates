import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-asset-upload-job.js';

describe('canva get-asset-upload-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-asset-upload-job',
        Model: 'ActionOutput_canva_getassetuploadjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
