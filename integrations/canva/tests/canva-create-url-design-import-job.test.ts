import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-url-design-import-job.js';

describe('canva create-url-design-import-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-url-design-import-job',
        Model: 'ActionOutput_canva_createurldesignimportjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
