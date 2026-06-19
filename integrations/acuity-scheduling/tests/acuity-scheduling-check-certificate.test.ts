import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-certificate.js';

describe('acuity-scheduling check-certificate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-certificate',
        Model: 'ActionOutput_acuity_scheduling_checkcertificate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
