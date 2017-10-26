// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as assert from 'assert';
import {fork, ForkOptions, spawn} from 'child_process';

async function runTask(taskScript: string,
                       env: {[key: string]: string}): Promise<string[]> {

  const options: ForkOptions = {env, stdio : [ 'pipe', 'pipe', 'pipe', 'ipc' ]};
  const taskProcess = fork(taskScript, [], options);
  const stdoutPromise = new Promise<string[]>((resolve) => {
    const allChunks: string[] = [];
    taskProcess.stdout.on('data', (chunk: string|Buffer) => allChunks.push(
                                      chunk && chunk.toString().trim()));
    taskProcess.stdout.on('close', () => resolve(allChunks));
  });
  return await new Promise<string[]>((resolve, reject) => {
    taskProcess.on('exit', () => resolve(stdoutPromise));
    taskProcess.on('error', reject);
  });
}

describe('functional tests', function(): void {
  this.timeout(0);
  let gcloudVersionPromise: Promise<string>;
  let taskOutput: string[];

  before('start gcloud version', () => {
    gcloudVersionPromise = new Promise<string>((resolve, reject) => {
      const gcloudProcess = spawn('gcloud', [ 'version' ], {shell : true});
      gcloudProcess.on(
          'exit', () => resolve(gcloudProcess.stdout.read().toString().trim()));
      gcloudProcess.on('error', reject);
    });
  });

  afterEach('write task output on failure', function(): void {
    if (this.currentTest.state === 'failed') {
      console.log('--- task output ---');
      console.log(taskOutput.join('\n---\n'));
    }
  });

  it('should run gcloud version', async () => {
    const variableName = 'outputVariable';
    const endpointAuth = JSON.stringify({
      parameters : {certificate : JSON.stringify({project_id : 'projectId'})}
    });
    const env = {
      ['INPUT_serviceEndpoint'] : 'endpoint',
      ['ENDPOINT_AUTH_endpoint'] : endpointAuth,
      ['INPUT_command'] : 'version',
      ['INPUT_includeProjectParam'] : 'false',
      ['INPUT_ignoreReturnCode'] : 'false',
      ['INPUT_outputVariable'] : variableName
    };

    taskOutput = await runTask('run.js', env);
    const gcloudVersionOutput = await gcloudVersionPromise;

    const setVariableTag =
        `##vso[task.setvariable variable=${variableName};secret=false;]`;
    let isVariableSet = false;
    taskOutput.forEach((chunk) => {
      if (chunk.startsWith(setVariableTag)) {
        assert.ok(chunk.endsWith(gcloudVersionOutput));
        isVariableSet = true;
      }
    });
    assert.ok(isVariableSet,
              'The variable should be set as visible in the output.');
  });
});
