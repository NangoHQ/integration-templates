import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-policy-url-bypasses.js';

describe('dope-security update-policy-url-bypasses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-policy-url-bypasses',
        Model: 'ActionOutput_dope_security_updatepolicyurlbypasses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should reject inheritsFromBase combined with custom/default and make no PUT request', async () => {
        const invalidNangoMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'update-policy-url-bypasses',
            Model: 'ActionOutput_dope_security_updatepolicyurlbypasses'
        });

        await expect(
            createAction.exec(invalidNangoMock, {
                policyName: 'RegistrySeedPolicy1',
                inheritsFromBase: true,
                custom: [{ name: '*.example.com' }]
            })
        ).rejects.toThrow();

        expect(invalidNangoMock.put).not.toHaveBeenCalled();
    });
});
