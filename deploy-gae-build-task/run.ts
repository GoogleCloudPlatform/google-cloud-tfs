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

import {Endpoint} from 'common/exec-options';
import {catchAll} from 'common/handle-rejection';
import * as task from 'vsts-task-lib/task';

import {deployGae} from './deploy-gae';

/**
 * @fileoverview This is the main script run by the deploy-gae-build-task.
 *   It takes input from the TFS build task GUI (defined by task.json) and
 * calls the deployGae method from the deploy-gae module.
 * @author przybjw@google.com (Jim Przybylinski)
 */

catchAll(run());

/**
 * Runs the script
 */
async function run(): Promise<void> {

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
  const yamlSource = task.getPathInput('sourceFolder', copyYaml);
  // The storage bucket to send to the --bucket parameter.
  const storageBucket = task.getInput('storageBucket', false);
  // The version to deploy.
  const versionInput = task.getInput('version', false);
  // Toggle between --promote and --no-promote parameters.
  const promote = task.getBoolInput('promote', true);
  // Toggle between --stop-previous-version and --no-stop-previous-version.
  const stopPrevious = task.getBoolInput('stopPrevious', promote);

  // Set up the key file from the certificate parameter of the service
  // endpoint.
  const endpoint = new Endpoint(endpointId);
  await deployGae({
    endpoint,
    copyYaml,
    yamlSource,
    storageBucket,
    versionInput,
    promote,
    stopPrevious,
    deploymentPath,
    yamlFileName,
  });
}
