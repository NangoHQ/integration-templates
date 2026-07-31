import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-presentation-metadata.js';

describe('microsoft-powerpoint-oauth2-cc update-presentation-metadata tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-presentation-metadata',
        Model: 'ActionOutput_microsoft_powerpoint_oauth2_cc_updatepresentationmetadata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
