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
 * @fileoverview This is the main script run by the deploy-gae-build-task.
 *   It takes input from the TFS build task GUI (defined by task.json).
 *   It then, if asked, copies the YAML file from the source folder to the
 *   deployment path. I writes a credential file from the endpoint
 *   authorization, and calls gcloud beta app deploy with various parameters.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import * as exec from 'common/exec-options';
import {isoNowString} from 'common/format';
import {catchAll} from 'common/handle-rejection';
import * as path from 'path';
import * as task from 'vsts-task-lib/task';
import {IExecOptions, IExecResult, ToolRunner} from 'vsts-task-lib/toolrunner';

import * as strings from './string-constants';

import Endpoint = exec.Endpoint;
import TaskResult = task.TaskResult;

/**
 * Runs the script
 */
async function run(): Promise<void> {
  // Check that gcloud exists.
  const gcloudPath = task.which('gcloud', true);
  checkGcloudVersion(gcloudPath);

  // Get inputs from GUI.
  // The id of the GCP service endpoint to get the credentials from.
  const endpointId = task.getInput('serviceEndpoint', true);
  // The path of the deployment files.
  const deploymentPath = task.getPathInput('deploymentPath', true);
  // The name of the YAML file we want to run on.
  const yamlFileName = task.getInput('yamlFileName', true);
  // If true, copy the YAML file from the source folder to the deployment
  // path.
  const copyYaml = task.getBoolInput('copyYaml', true);
  // The source folder the YAML file is in.
  const sourceFolder = task.getPathInput('sourceFolder', copyYaml);
  // The storage bucket to send to the --bucket parameter.
  const storageBucket = task.getInput('storageBucket', false);
  // The version to deploy.
  const versionInput = task.getInput('version', false);
  // Toggle between --promote and --no-promote parameters.
  const promote = task.getBoolInput('promote', true);
  // Toggle between --stop-previous-version and --no-stop-previous-version.
  const stopPrevious = task.getBoolInput('stopPrevious', promote);

  // Move YAML.
  const yamlPath = path.join(deploymentPath, yamlFileName);
  if (copyYaml) {
    task.cp(path.join(sourceFolder, yamlFileName), deploymentPath);
  }

  // Set version
  const version = versionInput || isoNowString();

  // Set up the key file from the certificate parameter of the service
  // endpoint.
  const endpoint = new Endpoint(endpointId);

  // Set gcloud arguments.
  const projectArg = endpoint.projectParam;
  const credentialArg = Endpoint.credentialParam;

  const gcloud: ToolRunner =
      task.tool(gcloudPath)
          .line('beta app deploy --quiet --verbosity=info')
          .arg([ `"${yamlPath}"`, credentialArg, projectArg ])
          .argIf(version, `--version="${version}"`)
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

function checkGcloudVersion(gcloudPath: string): void {
  interface GcloudVersion {
    ['Google Cloud SDK']: string;
    ['beta']: string;
  }
  const versionTool = task.tool(gcloudPath).line('version --format=json');
  const result: IExecResult = versionTool.execSync(exec.getQuietExecOptions());
  const cloudSdkVersionRegex = /\d*/;
  const versionData = JSON.parse(result.stdout) as GcloudVersion;
  const majorVersionString =
      versionData['Google Cloud SDK'].match(cloudSdkVersionRegex)[0];
  if (Number.parseInt(majorVersionString) < 146) {
    throw new Error(strings.oldGcloudVersionError);
  }

  if (!versionData['beta']) {
    throw new Error(strings.noGcloudBetaError);
  }
}

catchAll(run());
