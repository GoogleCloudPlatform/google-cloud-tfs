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
 * @fileoverview This is a common module that holds the IExecOptions for all
 * calls to gcloud and kubectl.
 * @author JimWP@google.com (Jim Przybylinski)
 */

import * as fs from 'fs';
import * as stream from 'stream';
import * as task from 'vsts-task-lib/task';
import {IExecOptions} from 'vsts-task-lib/toolrunner';

import * as sc from './strings';

import WritableStream = NodeJS.WritableStream;

/**
 * This function creates exec options useful for calls to gcloud. It
 * redirects stderr to stdout (because gcloud often uses stderr as an
 * alternative info stream). Causes stderr to look like normal output in the
 * build task logs. It turns off failing on stderr, and it sets environment
 * variables that allow tracking of calls made by gcloud on the google side.
 * @returns {IExecOptions} for gcloud calls.
 */
export function getDefaultExecOptions(): IExecOptions {
  const env: IExecOptions['env'] = {
    'CLOUDSDK_METRICS_ENVIRONMENT' : 'cloud-tools-tfs',
    'CLOUDSDK_METRICS_ENVIRONMENT_VERSION' : '0.0.9',
  };
  const cloudSdkPython = process.env['CLOUDSDK_PYTHON'];
  if (cloudSdkPython) {
    env['CLOUDSDK_PYTHON'] = cloudSdkPython;
  }
  return {
    env,
    windowsVerbatimArguments : true,
    errStream : process.stdout as WritableStream,
    ignoreReturnCode : false,
    failOnStdErr : false,
  } as IExecOptions;
}

/**
 * A set of exec options that avoid printing output to the log.
 * @returns {IExecOptions} for quiet gcloud calls.
 */
export function getQuietExecOptions(): IExecOptions {
  // Hide the stream output.
  // Hopefully replace this with execOptions.silent when that works.
  const protoWriter: PropertyDescriptorMap = {
    write : {
      value(chunk: Buffer|string, encoding?: string, callback?: Function):
          Boolean {
            let chunkString: string;
            if (encoding && chunk instanceof Buffer) {
              chunkString = chunk.toString(encoding);
            } else {
              chunkString = chunk.toString();
            }

            // For unit testing that gcloud was in fact run.
            if (chunkString.startsWith('[command]')) {
              return process.stdout.write(chunkString, encoding, callback);
            } else {
              if (callback) {
                callback();
              }
              return true;
            }
          },
    },
  };

  const execOptions = getDefaultExecOptions();
  execOptions.outStream = Object.create(stream.Writable, protoWriter);
  execOptions.errStream = Object.create(stream.Writable, protoWriter);
  return execOptions;
}

/**
 * A class that take a tfs service endpoint id, and creates the credentials
 * files needed by gcloud. It also cleans up those credential files.
 */
export class Endpoint {
  static readonly jsonKeyFilePath: string = sc.jsonKeyFilePath;
  static readonly credentialParam: string = sc.credentialParam;
  readonly projectId: string;
  readonly jsonKeyValue: string;

  constructor(endpointId: string, di = {task}) {
    const endpointAuth = di.task.getEndpointAuthorization(endpointId, false);
    this.jsonKeyValue = endpointAuth.parameters['certificate'];
    this.projectId = JSON.parse(this.jsonKeyValue).project_id;
  }

  /**
   * Works like a c# using function, creating and then cleaning credential
   * files.
   * @param callback Acts like the block of a using statement.
   */
  using<T>(callback: () => T): T {
    this.initCredentials();
    try {
      return callback();
    } finally {
      this.clearCredentials();
    }
  }

  /**
   * An async version of the using statement.
   * @param callback The async code to run.
   */
  async usingAsync<T>(callback: () => PromiseLike<T>): Promise<T> {
    this.initCredentials();
    try {
      return await callback();
    } finally {
      this.clearCredentials();
    }
  }

  /**
   * Writes the json key file.
   */
  initCredentials(): void {
    task.writeFile(Endpoint.jsonKeyFilePath, this.jsonKeyValue);
  }

  /**
   * Deletes the json key file.
   */
  clearCredentials(): void { fs.unlinkSync(Endpoint.jsonKeyFilePath); }

  /**
   * The project id as a gcloud parameter.
   * @returns {string} --project="projectId"
   */
  get projectParam(): string { return `--project="${this.projectId}"`; }
}

/**
 * This is a class that creates and cleans up configuration files for gcloud and
 * kubectl.
 */
export class KubeEndpoint extends Endpoint {
  static readonly kubeConfigParam: string = sc.kubeConfigParam;
  readonly cluster: string;
  readonly zone: string;

  /**
   * Creates a KubeEndpoint for the given cluster at the given tfs service
   * endpoint.
   * @param endpointData The GCP connection data.
   * @param cluster The name of the cluster to connect to.
   * @param zone The zone the cluster resides in.
   */
  constructor(endpointId: string, cluster: string, zone: string) {
    super(endpointId);
    this.cluster = cluster;
    this.zone = zone;
  }

  /**
   * Creates a kubeConfig json file that defines the cluster we are
   * connecting to.
   */
  initCredentials(): void {
    super.initCredentials();
    try {
      const execOptions: IExecOptions = this.quietKubectlExecOptions;
      execOptions.env['KUBECONFIG'] = sc.kubeConfigPath;
      const result = task.tool(task.which('gcloud', true))
                         .line('container clusters get-credentials')
                         .arg(this.cluster)
                         .arg(`--zone=${this.zone}`)
                         .arg(this.projectParam)
                         .arg(KubeEndpoint.credentialParam)
                         .execSync(execOptions);
      if (result.error) {
        throw result.error;
      } else if (result.code !== 0) {
        throw new Error(result.stderr);
      }
    } catch (e) {
      super.clearCredentials();
      throw e;
    }
  }

  /**
   * Additionally, deletes the kubernetes config file.
   */
  clearCredentials(): void {
    fs.unlinkSync(sc.kubeConfigPath);
    super.clearCredentials();
  }

  /**
   * Exec options for a kubectl call.
   * @returns {IExecOptions} for a kubectl call.
   */
  get quietKubectlExecOptions(): IExecOptions {
    const execOptions = getQuietExecOptions();
    this.setKubectlEnv(execOptions);
    return execOptions;
  }

  /**
   * Exec options for a kubectl call that does not output to the console.
   * @returns {IExecOptions} for a kubectl call.
   */
  get defaultKubectlExecOptions(): IExecOptions {
    const execOptions = getDefaultExecOptions();
    this.setKubectlEnv(execOptions);
    return execOptions;
  }

  /**
   * Appends kubectl require properties to the execOptions env.
   * @param execOptions the exec options to append the env variables to.
   */
  setKubectlEnv(execOptions: IExecOptions): void {
    const credentialVariableName = 'GOOGLE_APPLICATION_CREDENTIALS';
    const useDefaultCredentialsVariableName =
        'CLOUDSDK_CONTAINER_USE_APPLICATION_DEFAULT_CREDENTIALS';
    execOptions.env[credentialVariableName] = sc.jsonKeyFilePath;
    execOptions.env[useDefaultCredentialsVariableName] = 'true';
  }
}
