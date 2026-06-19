import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-certificate.js';

describe('acuity-scheduling delete-certificate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-certificate',
        Model: 'ActionOutput_acuity_scheduling_deletecertificate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
