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

import * as exec from 'common/exec-options';
import {isoNowString} from 'common/format';
import * as path from 'path';
import * as task from 'vsts-task-lib/task';
import {IExecOptions, IExecResult, ToolRunner} from 'vsts-task-lib/toolrunner';

import * as strings from './string-constants';

import Endpoint = exec.Endpoint;
import TaskResult = task.TaskResult;

/**
 * @fileoverview This is the main logic of the Deploy to GAE task. It copies
 * the YAML file from the source folder to the deployment path, writes a
 * credential file from the endpoint authorization, and calls gcloud app
 * deploy with various parameters.
 * @author przybjw@google.com (Jim Przybylinski)
 */

export interface RunOptions {
  deploymentPath: string;
  yamlFileName: string;
  version?: string;
  endpoint: Endpoint;
  storageBucket?: string;
  copyYaml: boolean;
  yamlSource?: string;
  promote: boolean;
  stopPrevious?: boolean;
}

export async function deployGae({
  deploymentPath,
  yamlFileName,
  storageBucket,
  copyYaml,
  yamlSource,
  endpoint,
  promote,
  stopPrevious,
  version
}: RunOptions): Promise<void> {
  const gcloudPath = validateGcloud();

  // Move YAML.
  const yamlPath = path.join(deploymentPath, yamlFileName);
  if (copyYaml) {
    const appendedSource = path.join(yamlSource, yamlFileName);
    if (yamlSource.endsWith(yamlFileName) && !task.exist(appendedSource)) {
      task.cp(yamlSource, deploymentPath);
    } else {
      task.cp(appendedSource, deploymentPath);
    }
  }

  // Set gcloud arguments.
  const gcloud: ToolRunner =
      task.tool(gcloudPath)
          .line('app deploy --quiet --verbosity=info')
          .arg([
            `"${yamlPath}"`, Endpoint.credentialParam, endpoint.projectParam
          ])
          .arg(`--version="${version || isoNowString()}"`)
          .argIf(storageBucket, `--bucket="${storageBucket}"`)
          .argIf(promote, '--promote')
          .argIf(!promote, '--no-promote')
          .argIf(promote && stopPrevious, '--stop-previous-version')
          .argIf(promote && !stopPrevious, '--no-stop-previous-version');

  const execOptions: IExecOptions = exec.getDefaultExecOptions();

  // Write credential file.
  await endpoint.usingAsync(async () => {
    // Run gcloud. Do it async so console output is sent to TFS immediately.
    await gcloud.exec(execOptions);
    task.setResult(TaskResult.Succeeded, 'Deployment succeeded');
  });
}

function validateGcloud(): string {
  interface GcloudVersion {
    ['Google Cloud SDK']: string;
  }

  const gcloudPath = task.which('gcloud', true);
  const versionTool = task.tool(gcloudPath).line('version --format=json');
  const result: IExecResult = versionTool.execSync(exec.getQuietExecOptions());
  const cloudSdkVersionRegex = /\d*/;
  const versionData = JSON.parse(result.stdout) as GcloudVersion;
  const majorVersionString =
      versionData['Google Cloud SDK'].match(cloudSdkVersionRegex)[0];
  if (Number.parseInt(majorVersionString) < 174) {
    throw new Error(strings.oldGcloudVersionError);
  }
  return gcloudPath;
}
