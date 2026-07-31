import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/download-workflow-document.js';

describe('ironclad download-workflow-document tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'download-workflow-document',
        Model: 'ActionOutput_ironclad_downloadworkflowdocument'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
