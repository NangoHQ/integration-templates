import { expect, it, describe } from 'vitest';

import runAction from '../actions/fetch-teams.js';

describe('jira fetch-teams tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'fetch-teams',
        Model: 'Teams'
    });
    it('should throw error when issueKey is missing', async () => {
        await expect(runAction(nangoMock as any, '')).rejects.toThrow();
    });

    // TODO: Generate tests with nango using real data from api once added
    // command: npm run dryrun -- jira fetch-teams jir-test --input "{created issue}" --save-reponse

    /*    it('should output the action output that is expected', async () => {
    *        const input = await nangoMock.getInput();
    *        const response = await runAction(nangoMock, input);
    *        const output = await nangoMock.getOutput();
    
    *        expect(response).toEqual(output);
    *    });
    */
});
