import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-documents.js';

describe('pipelinecrm list-documents tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-documents',
        Model: 'ActionOutput_pipelinecrm_listdocuments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
