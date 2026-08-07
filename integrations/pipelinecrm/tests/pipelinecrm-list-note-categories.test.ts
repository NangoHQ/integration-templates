import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-note-categories.js';

describe('pipelinecrm list-note-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-note-categories',
        Model: 'ActionOutput_pipelinecrm_listnotecategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
