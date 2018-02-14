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

import {fork, ForkOptions} from 'child_process';

/**
 * @fileoverview A central class for calling a task and parsing the output.
 * @author JimWP@google.com (Jim Przybylinski)
 */
export class TaskResult {

  private readonly outputData: string[];

  constructor(sdtoutData: string[]) {
    this.outputData = sdtoutData.join('\n').split(/\n+/);
  }

  static async runTask(taskScript: string,
                       env: {[key: string]: string}): Promise<TaskResult> {
    for (const variableName of Object.keys(process.env)) {
      if (env[variableName] === undefined) {
        env[variableName] = process.env[variableName];
      }
    }
    const options: ForkOptions = {
      env,
      stdio : [ 'pipe', 'pipe', 'pipe', 'ipc' ],
    };
    const taskProcess = fork(taskScript, [], options);
    const stdoutPromise = new Promise<string[]>((resolve) => {
      const allChunks: string[] = [];
      taskProcess.stdout.on('data', (chunk: string|Buffer) => allChunks.push(
                                        chunk && chunk.toString().trim()));
      taskProcess.stdout.on('close', () => resolve(allChunks));
    });
    return await new Promise<TaskResult>((resolve, reject) => {
      taskProcess.on('exit',
                     async () => resolve(new TaskResult(await stdoutPromise)));
      taskProcess.on('error', reject);
    });
  }

  getVariable(this: TaskResult, variableName: string, secret = false): string {
    const setVariableTag =
        `##vso[task.setvariable variable=${variableName};issecret=${secret};]`;
    let value: string = undefined;
    for (const line of this.outputData) {
      if (line.startsWith(setVariableTag)) {
        value = line.substring(setVariableTag.length);
      }
    }
    return value;
  }

  logData(this: TaskResult): void {
    console.log('--- task output ---');
    console.log(this.outputData.join('\n'));
  }

  getStatus(this: TaskResult): [ 'failed'|'succeeded', string ] {
    const taskSuccessResult = '##vso[task.complete result=Succeeded;]';
    const taskFailedResult = '##vso[task.complete result=Failed;]';
    let successMessage: string = undefined;
    for (const chunk of this.outputData) {
      if (chunk.startsWith(taskSuccessResult)) {
        successMessage = chunk.substring(taskSuccessResult.length);
      } else if (chunk.startsWith(taskFailedResult)) {
        return [ 'failed', chunk.substring(taskFailedResult.length) ];
      }
    }
    return [ 'succeeded', successMessage ];
  }

  getDebugLines(this: TaskResult, match: string|RegExp|null = null): string[] {
    const taskDebugTag = '##vso[task.debug]';
    const debugLines: string[] = [];
    for (const chunk of this.outputData) {
      if (chunk.startsWith(taskDebugTag)) {
        const line = chunk.substring(taskDebugTag.length);
        if (match === null) {
          debugLines.push(line);
        } else if (typeof match === 'string') {
          if (line.includes(match)) {
            debugLines.push(line);
          }
        } else {
          if (match.test(line)) {
            debugLines.push(line);
          }
        }
      }
    }
    return debugLines;
  }
}
