import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-organization.js';

describe('zendesk create-organization tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-organization',
        Model: 'ActionOutput_zendesk_createorganization'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
