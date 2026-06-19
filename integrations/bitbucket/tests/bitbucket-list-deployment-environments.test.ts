import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-deployment-environments.js';

describe('bitbucket list-deployment-environments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-deployment-environments',
        Model: 'ActionOutput_bitbucket_listdeploymentenvironments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
