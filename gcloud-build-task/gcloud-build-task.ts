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

/**
 * @fileoverview This module holds the logic for the gcloud-build-task.
 * @author JimWP@google.com (Jim Przybylinski)
 */

import {Endpoint, getDefaultExecOptions} from 'common/exec-options';
import * as task from 'vsts-task-lib/task';
import {IExecOptions, ToolRunner} from 'vsts-task-lib/toolrunner';

import TaskResult = task.TaskResult;

export interface RunGcloudOptions {
  gcloudTool: ToolRunner;
  endpointId: string;
  command: string;
  includeProjectParam: boolean;
  ignoreReturnCode: boolean;
  outputVariable?: string;
}

export function runGcloud(runOptions: RunGcloudOptions): void {
  const endpoint = new Endpoint(runOptions.endpointId);

  runOptions.gcloudTool.line(runOptions.command)
      .arg(Endpoint.credentialParam)
      .argIf(runOptions.includeProjectParam, endpoint.projectParam);
  const execOptions: IExecOptions = getDefaultExecOptions();
  execOptions.ignoreReturnCode = runOptions.ignoreReturnCode;

  endpoint.using(() => {
    const result = runOptions.gcloudTool.execSync(execOptions);
    if (result.error) {
      const errorMessage =
          result.error.message || result.stderr || result.stdout;
      task.error(errorMessage);
      task.setResult(TaskResult.Failed, errorMessage);
    } else if (runOptions.outputVariable) {
      task.setVariable(runOptions.outputVariable, result.stdout);
    }
  });
}
