// Copyright 2017 Google Inc. All Rights Reserved
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

import {getDefaultExecOptions} from 'common/exec-options';
import * as http from 'http';
import {ClientRequest, IncomingMessage} from 'http';
import * as os from 'os';
import * as path from 'path';
import * as task from 'vsts-task-lib';
import * as toolLib from 'vsts-task-tool-lib/tool';

const cloudSdkId = 'google-cloud-sdk';
const urlRoot = 'http://dl.google.com/dl/cloudsdk/channels/rapid';
const downloadUrlRoot = `${urlRoot}/downloads`;

export class CloudSdkPackage {
  private readonly version: string;
  private toolPath: string;

  constructor(versionString: string) {
    this.version = toolLib.cleanVersion(versionString);
    this.toolPath = toolLib.findLocalTool(cloudSdkId, this.version);
  }

  static async queryLatestVersion(): Promise<string> {
    const versionDoc = `${urlRoot}/components-2.json`;
    const message = await new Promise<IncomingMessage>((resolve, reject) => {
      const request: ClientRequest = http.get(versionDoc, resolve);
      request.on('error', reject);
    });

    const data: string = await new Promise<string>((resolve) => {
      let rawData: string = '';
      message.on('data', (chunk: string) => rawData += chunk);
      message.on('end', () => resolve(rawData));
    });
    return JSON.parse(data)['version'] as string;
  }

  isCached(): boolean { return this.toolPath && this.toolPath.length > 0; }

  async init(allowReporting: boolean) {
    toolLib.prependPath(path.join(this.toolPath, 'google-cloud-sdk', 'bin'));
    await task.tool(task.which('gcloud'))
        .line(`config set disable_usage_reporting ${!allowReporting}`)
        .exec();
  }

  async aquire(allowReporting: boolean) {
    const downloadPath: string =
        await toolLib.downloadTool(this.getDownloadUrl());
    const extractedPath: string = await this.extractArchive(downloadPath);
    this.toolPath = await toolLib.cacheDir(extractedPath, cloudSdkId,
                                           this.version, os.arch());
    const installerPath: string =
        path.join(this.toolPath, 'google-cloud-sdk', this.getInstallFile());
    const execOptions = getDefaultExecOptions();
    execOptions.env['CLOUDSDK_CORE_DISABLE_PROMPTS'] = 'true';
    await task.tool(installerPath)
        .line('--quiet')
        .line(`--usage-reporting ${allowReporting}`)
        .exec(execOptions);
    toolLib.prependPath(path.join(this.toolPath, 'google-cloud-sdk', 'bin'));
    task.tool(task.which('gcloud'))
        .line('components install kubectl beta')
        .exec(execOptions);
  }

  private getInstallFile() {
    switch (os.platform()) {
    case 'win32':
      return 'install.bat';
    case 'linux':
      return 'install.sh';
    case 'darwin':
      return 'install.sh';
    default:
      throw new Error(`Unsupported operating system: ${os.platform()}.`);
    }
  }

  private getDownloadUrl(): string {
    const filePrefix = `google-cloud-sdk-${this.version}`;
    const archString = this.getOsArchString();
    switch (os.platform()) {
    case 'win32':
      return `${downloadUrlRoot}/${filePrefix}-windows-` +
             `${archString}-bundled-python.zip`;
    case 'linux':
      return `${downloadUrlRoot}/${filePrefix}-linux-${archString}.tar.gz`;
    case 'darwin':
      return `${downloadUrlRoot}/${filePrefix}-darwin-${archString}.tar.gz`;
    default:
      throw new Error(`Unsupported operating system: ${os.platform()}.`);
    }
  }

  private getOsArchString() {
    switch (os.arch()) {
    case 'x64':
      return 'x86_64';
    case 'x86':
      return 'x86';
    default:
      throw new Error(`Unsupported architecture: ${os.arch()}`);
    }
  }

  private async extractArchive(file: string): Promise<string> {
    switch (os.platform()) {
    case 'win32':
      return await toolLib.extractZip(file);
    case 'linux':
      return await toolLib.extractTar(file);
    case 'darwin':
      return await toolLib.extractTar(file);
    default:
      throw new Error(`Unsupported operating system: ${os.platform()}.`);
    }
  }
}
