import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-service-accounts-to-projects.js';

describe('mixpanel add-service-accounts-to-projects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-service-accounts-to-projects',
        Model: 'ActionOutput_mixpanel_addserviceaccountstoprojects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
