import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-policy-ssl-inspection.js';

describe('dope-security update-policy-ssl-inspection tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-policy-ssl-inspection',
        Model: 'ActionOutput_dope_security_updatepolicysslinspection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
