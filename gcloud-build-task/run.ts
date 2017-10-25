﻿// Copyright 2017 Google Inc. All Rights Reserved.
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
 * @fileoverview This is the entry point for the gcloud build task.
 * @author JimWP@google.com (Jim Przybylinski)
 */
import {Endpoint} from 'common/exec-options';
import {catchAll} from 'common/handle-rejection';
import * as task from 'vsts-task-lib/task';

import {runGcloud, RunGcloudOptions} from './gcloud-build-task';

function run(): void {
  const runOptions: RunGcloudOptions = {
    // Check that gcloud exists.
    gcloudTool : task.tool(task.which('gcloud', true)),

    // Get inputs from GUI.
    // The id of the GCP service endpoint to get the credentials from.
    endpoint : new Endpoint(task.getInput('serviceEndpoint', true)),
    command : task.getInput('command', true),
    includeProjectParam : task.getBoolInput('includeProjectParam', true),
    ignoreReturnCode : task.getBoolInput('ignoreReturnCode', true),
    outputVariable : task.getInput('outputVariable', false),
  };
  runGcloud(runOptions);
}

catchAll(run);
