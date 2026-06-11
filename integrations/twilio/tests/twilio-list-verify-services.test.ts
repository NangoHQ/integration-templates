import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-verify-services.js';

describe('twilio list-verify-services tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-verify-services',
        Model: 'ActionOutput_twilio_listverifyservices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
