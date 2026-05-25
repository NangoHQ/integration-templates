import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-service-principals.js';

describe('microsoft list-service-principals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-service-principals',
        Model: 'ActionOutput_microsoft_listserviceprincipals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
