import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-workflow-comment.js';

describe('ironclad create-workflow-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-workflow-comment',
        Model: 'ActionOutput_ironclad_createworkflowcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
