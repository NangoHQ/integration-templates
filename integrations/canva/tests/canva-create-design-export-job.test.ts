import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-design-export-job.js';

describe('canva create-design-export-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-design-export-job',
        Model: 'ActionOutput_canva_createdesignexportjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
