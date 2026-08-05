import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-role.js';

describe('datadog update-role tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-role',
        Model: 'ActionOutput_datadog_updaterole'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
