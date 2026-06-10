import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-usage-records.js';

describe('twilio list-usage-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-usage-records',
        Model: 'ActionOutput_twilio_listusagerecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
