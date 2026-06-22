import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-design-export-job.js';

describe('canva get-design-export-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-design-export-job',
        Model: 'ActionOutput_canva_getdesignexportjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
