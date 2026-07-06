import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-requisition.js';

describe('lever-basic create-requisition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-requisition',
        Model: 'ActionOutput_lever_basic_createrequisition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
