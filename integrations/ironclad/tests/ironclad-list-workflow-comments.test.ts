import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workflow-comments.js';

describe('ironclad list-workflow-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workflow-comments',
        Model: 'ActionOutput_ironclad_listworkflowcomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
