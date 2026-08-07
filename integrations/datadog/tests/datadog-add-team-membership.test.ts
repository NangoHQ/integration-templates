import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-team-membership.js';

describe('datadog add-team-membership tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-team-membership',
        Model: 'ActionOutput_datadog_addteammembership'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
