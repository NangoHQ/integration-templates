import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-workflow-attributes.js';

describe('ironclad update-workflow-attributes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-workflow-attributes',
        Model: 'ActionOutput_ironclad_updateworkflowattributes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
