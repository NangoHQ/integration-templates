import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-sensitive-data-scanner-rule.js';

describe('datadog delete-sensitive-data-scanner-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-sensitive-data-scanner-rule',
        Model: 'ActionOutput_datadog_deletesensitivedatascannerrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
