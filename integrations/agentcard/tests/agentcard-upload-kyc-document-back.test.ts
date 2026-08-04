import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-kyc-document-back.js';

describe('agentcard upload-kyc-document-back tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-kyc-document-back',
        Model: 'ActionOutput_agentcard_uploadkycdocumentback'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
