import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-kyc-document-front.js';

describe('agentcard upload-kyc-document-front tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-kyc-document-front',
        Model: 'ActionOutput_agentcard_uploadkycdocumentfront'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
