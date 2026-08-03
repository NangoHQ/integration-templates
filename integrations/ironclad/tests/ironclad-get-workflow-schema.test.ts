import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-workflow-schema.js';

describe('ironclad get-workflow-schema tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-workflow-schema',
        Model: 'ActionOutput_ironclad_getworkflowschema'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
