import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-url-design-import-job.js';

describe('canva get-url-design-import-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-url-design-import-job',
        Model: 'ActionOutput_canva_geturldesignimportjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
