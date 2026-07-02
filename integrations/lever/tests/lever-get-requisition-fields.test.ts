import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-requisition-fields.js';

describe('lever-basic get-requisition-fields tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-requisition-fields',
        Model: 'ActionOutput_lever_basic_getrequisitionfields'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
