[![Build status][AppVeyorBadge]][AppVeyorLink]
[![codecov][CodeCovBadge]][CodeCovLink]

# ![GcpLogo][GcpLogo] Cloud Tools for Team Foundation Server

This repository contains an extension for Team Foundation server and Visual
Studio Team Services. The extension provides a new service endpoint and several
build tasks for interacting with Google Cloud Platform.

## Installation

This extension is in private alpha. Approved users can get the latest version
on the [Visual Studio Marketplace][Marketplace].
Anyone can get the source and package of the latest release from [GitHub Releases][GitHubReleases].
The latest development version is available from [AppVeyor][AppVeyor].

You can [build the vsix package from source](#Build), and then upload and
install the extension from the extension management page of TFS.

## Documentation

For Documentation on using the extension, see [DETAILS.md](DETAILS.md)

## Support

Issues are tracked on [GitHub][GitHubIssues].
Questions can be asked on StackOverflow
  - [Ask a question][StackOverflowAsk]
  - [Browse asked questions][StackOverflowBrowse]

## Build

### Prerequisites

  - [PowerShell][PowerShell]: Installed by default on modern windows platforms.
  - [Node.js][Node]: Download and install from the website.
  - [npm][npm]: Installed along with Node.js.
  - [TypeScript][TypeScript]: Install with `npm install -g typescript`
  - [tfx][tfs-cli]: The tfs cli. Install with `npm install -g tfx-cli`
  - [mocha][mocha]: A JavaScript test runner. `npm install -g mocha`
  - [ts-node]: Used by mocha to run TypeScript directly. `npm install -g ts-node`
  - [nyc][nyc]: The Istanbul code coverage tool. Install with `npm install -g nyc`

### Build Script

Execute build script `./build/BuildExtension.ps1`. It will download needed
modules, build the common files and build tasks, and then package everything
into `./bin/Google Cloud Tools.google-cloud-tfs-<version>.vsix`.

## Contributing

 See our [Contributing guide](CONTRIBUTING.md)

[GcpLogo]: images/cloud_64x64.png
[PowerShell]: https://msdn.microsoft.com/powershell
[Node]: https://nodejs.org
[npm]: https://www.npmjs.com
[TypeScript]: https://www.typescriptlang.org
[tfs-cli]: https://github.com/Microsoft/tfs-cli
[mocha]: https://mochajs.org/
[ts-node]: https://www.npmjs.com/package/ts-node
[nyc]: https://istanbul.js.org/
[CloudSdk]: https://cloud.google.com/sdk/downloads

[GitHubIssues]: https://github.com/GoogleCloudPlatform/google-cloud-tfs/issues
[GitHubReleases]: https://github.com/GoogleCloudPlatform/google-cloud-tfs/releases

[Marketplace]: https://marketplace.visualstudio.com/items?itemName=GoogleCloudTools.google-cloud-tfs

[AppVeyor]: https://ci.appveyor.com/project/ILMTitan/google-cloud-tfs/build/artifacts
[AppVeyorBadge]: https://ci.appveyor.com/api/projects/status/hu7qlgxrh2j0i35y/branch/master?svg=true
[AppVeyorLink]: https://ci.appveyor.com/project/ILMTitan/google-cloud-tfs/branch/master

[CodeCovBadge]: https://codecov.io/gh/GoogleCloudPlatform/google-cloud-tfs/branch/master/graph/badge.svg
[CodeCovLink]: https://codecov.io/gh/GoogleCloudPlatform/google-cloud-tfs

[StackOverflowAsk]: http://stackoverflow.com/questions/ask?tags=google-cloud-tfs
[StackOverflowBrowse]: http://stackoverflow.com/questions/tagged/google-cloud-tfs

