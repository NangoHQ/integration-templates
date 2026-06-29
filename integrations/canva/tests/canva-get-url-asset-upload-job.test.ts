import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-url-asset-upload-job.js';

describe('canva get-url-asset-upload-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-url-asset-upload-job',
        Model: 'ActionOutput_canva_geturlassetuploadjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
