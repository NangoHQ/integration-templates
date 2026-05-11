import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sobject-basic-info.js';

describe('salesforce get-sobject-basic-info tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-sobject-basic-info',
        Model: 'ActionOutput_salesforce_getsobjectbasicinfo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
