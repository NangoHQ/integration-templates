import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/disassociate-records.js';

describe('microsoft-dataverse disassociate-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'disassociate-records',
        Model: 'ActionOutput_microsoft_dataverse_disassociaterecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
