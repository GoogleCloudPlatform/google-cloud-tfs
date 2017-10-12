# Cloud Tools for Team Foundation Server
## Release Process

1. Create a new release on Github. The name of the tag should match the version.
2. AppVeyor will automatically start a new build.
3. Wait for AppVeyor to complete and attach the new vsix artifact to the Github release.
4. Log in to the [Visual Studio Marketplace][VisualStudioMarketplace] as ct4vs@outlook.com (password in [valintine](go/valintine)).
5. Update Cloud Tools for TFS with the new package.
6. Create a new PR to update the version for the next release in the manifest.json.

[VisualStudioMarketplace]: https://marketplace.visualstudio.com/manage/publishers
