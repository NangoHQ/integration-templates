import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-organization.js';

describe('microsoft update-organization tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-organization',
        Model: 'ActionOutput_microsoft_updateorganization'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
