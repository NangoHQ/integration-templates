import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-knowledge-articles.js';

describe('servicenow list-knowledge-articles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-knowledge-articles',
        Model: 'ActionOutput_servicenow_listknowledgearticles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
