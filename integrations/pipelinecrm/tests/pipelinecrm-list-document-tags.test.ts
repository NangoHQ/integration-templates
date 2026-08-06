import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-document-tags.js';

describe('pipelinecrm list-document-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-document-tags',
        Model: 'ActionOutput_pipelinecrm_listdocumenttags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
