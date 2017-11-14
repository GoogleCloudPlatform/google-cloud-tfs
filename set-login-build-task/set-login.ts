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
 * @fileoverview This is the main script run by the set-login-build-task.
 *   It takes various inputs from the TFS build task GUI (defined in
 *   task.json), writes a credential file from the service endpoint
 *   authorization, and calls gcloud compute reset-windows-password to create
 *   a new password for a user. It then writes the new password and machine ip
 *   to specified build variables.
 * @author JimWP@google.com
 */
import {Endpoint, getQuietExecOptions} from 'common/exec-options';
import {catchAll} from 'common/handle-rejection';
import * as task from 'vsts-task-lib/task';
import {IExecOptions} from 'vsts-task-lib/toolrunner';

import TaskResult = task.TaskResult;

/**
 * Runs the task.
 */
function run(): void {
  // Check that gcloud exists.
  const gcloudPath = task.which('gcloud', true);

  // Get inputs from GUI
  const endpointId = task.getInput('serviceEndpoint', true);
  const zone = task.getInput('zone', true);
  const instance = task.getInput('machine', true);
  const userName = task.getInput('userName', true);
  const passwordVariable = task.getInput('passwordOutput', true);
  const machineIpVariable = task.getInput('machineIpOutput', true);

  // Set up the key file from the certificate parameter
  // of the service endpoint.
  const endpoint = new Endpoint(endpointId);

  // Set gcloud arguments
  const projectArg = endpoint.projectParam;
  const zoneArg = `--zone=${zone}`;
  const userArg = `--user=${userName}`;
  const credentialArg = Endpoint.credentialParam;

  const gcloud =
      task.tool(gcloudPath)
          .line('compute reset-windows-password --quiet --format=json')
          .arg([ instance, userArg, zoneArg, projectArg, credentialArg ]);

  const execOptions: IExecOptions = getQuietExecOptions();

  endpoint.using(() => {
    const gcloudResult = gcloud.execSync(execOptions);
    if (gcloudResult.code !== 0) {
      task.setResult(TaskResult.Failed,
                     gcloudResult.error && gcloudResult.error.message ||
                         gcloudResult.stderr || gcloudResult.stdout);
    } else {
      // ReSharper disable once InconsistentNaming
      const data = JSON.parse(gcloudResult.stdout) as {
        ip_address: string;
        password: string;
      };
      setVariable(machineIpVariable, data.ip_address, false,
                  `Could not find external ip for instance ${
                      instance} in zone ${zone}`);
      setVariable(passwordVariable, data.password, true,
                  `Could not find new password for instance ${instance}` +
                      ` in zone ${zone}`);
    }
  });
}

/**
 * Sets a variable.
 * @param variable The name of the variable to set.
 * @param value The value of the variable to set.
 * @param secret If the variable should be secret.
 * @param errorMessage The message to fail with if the variable does not exist.
 */
function setVariable(variable: string, value: string, secret: boolean,
                     errorMessage: string): void {
  if (value) {
    task.setVariable(variable, value, secret);
  } else {
    task.setResult(task.TaskResult.Failed, errorMessage);
  }
}

catchAll(run);
