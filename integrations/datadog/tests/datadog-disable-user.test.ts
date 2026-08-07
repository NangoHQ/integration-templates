import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/disable-user.js';

describe('datadog disable-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'disable-user',
        Model: 'ActionOutput_datadog_disableuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
