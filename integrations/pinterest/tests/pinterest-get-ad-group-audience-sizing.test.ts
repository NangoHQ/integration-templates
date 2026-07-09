import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ad-group-audience-sizing.js';

describe('pinterest get-ad-group-audience-sizing tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ad-group-audience-sizing',
        Model: 'ActionOutput_pinterest_getadgroupaudiencesizing'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
