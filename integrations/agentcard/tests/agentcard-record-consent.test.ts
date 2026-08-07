import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/record-consent.js';

describe('agentcard record-consent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'record-consent',
        Model: 'ActionOutput_agentcard_recordconsent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
