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
import {ToolRunner} from 'vsts-task-lib/toolrunner';

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
  endpoint: Endpoint;
  deploymentPath: string;
  yamlFileName: string;
  imageUrl?: string;
  yamlSource?: string;
  storageBucket?: string;
  version?: string;
  promote: boolean;
  stopPrevious?: boolean;
  verbosity: string;
}

export async function deployGae({
  endpoint,
  deploymentPath,
  yamlFileName,
  imageUrl,
  yamlSource,
  storageBucket,
  version,
  promote,
  stopPrevious,
  verbosity,
}: RunOptions): Promise<void> {
  const gcloudPath = validateGcloud();

  // Move YAML.
  const yamlPath = path.join(deploymentPath, yamlFileName);
  if (yamlSource) {
    const appendedSource = path.join(yamlSource, yamlFileName);
    if (yamlSource.endsWith(yamlFileName) && !task.exist(appendedSource)) {
      task.cp(yamlSource, deploymentPath);
    } else {
      task.cp(appendedSource, deploymentPath);
    }
  }

  // Replace $PROJECTID in imageUrl.
  if (imageUrl) {
    imageUrl = imageUrl.replace('$PROJECTID', endpoint.projectId);
  }

  // Set gcloud arguments.
  const gcloud: ToolRunner =
      task.tool(gcloudPath)
          .line('app deploy --quiet')
          .arg(`--verbosity=${verbosity}`)
          .arg(`"${yamlPath}"`)
          .arg(Endpoint.credentialParam)
          .arg(endpoint.projectParam)
          .arg(`--version="${version || isoNowString()}"`)
          .argIf(imageUrl, `--image-url="${imageUrl}"`)
          .argIf(storageBucket, `--bucket="${storageBucket}"`)
          .argIf(promote, '--promote')
          .argIf(!promote, '--no-promote')
          .argIf(promote && stopPrevious, '--stop-previous-version')
          .argIf(promote && !stopPrevious, '--no-stop-previous-version');

  // Write credential file.
  await endpoint.usingAsync(async () => {
    // Run gcloud. Do it async so console output is sent to TFS immediately.
    await gcloud.exec(exec.getDefaultExecOptions());
    task.setResult(TaskResult.Succeeded, 'Deployment succeeded');
  });
}

function validateGcloud(): string {
  interface GcloudVersion {
    ['Google Cloud SDK']: string;
  }

  const gcloudPath = task.which('gcloud', true);
  const versionTool = task.tool(gcloudPath).line('version --format=json');
  const result = versionTool.execSync(exec.getQuietExecOptions());
  const cloudSdkVersionRegex = /\d*/;
  const versionData: GcloudVersion = JSON.parse(result.stdout) as GcloudVersion;
  const majorVersionString =
      versionData['Google Cloud SDK'].match(cloudSdkVersionRegex)[0];
  if (Number.parseInt(majorVersionString) < 174) {
    throw new Error(strings.oldGcloudVersionError);
  }
  return gcloudPath;
}
