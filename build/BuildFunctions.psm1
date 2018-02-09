<##
 # Copyright 2017 Google Inc.
 # 
 # Licensed under the Apache License, Version 2.0 (the "License");
 # you may not use this file except in compliance with the License.
 # You may obtain a copy of the License at
 # 
 #     http://www.apache.org/licenses/LICENSE-2.0
 # 
 # Unless required by applicable law or agreed to in writing, software
 # distributed under the License is distributed on an "AS IS" BASIS,
 # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 # See the License for the specific language governing permissions and
 # limitations under the License.
 ##>
Param(
    $VerbosePreference
)

function Initialize-All([string[]]$tasks) {
    Write-Host "Initialize modules and tasks"
    Initialize-PsTask "install-cloud-sdk-build-task"
}

function Initialize-PsTask([string]$task) {
    Write-Host "Initialize PowerShell task $task"
    pushd $task
    try {
        if (-not (Test-Path ps_modules)) {
            Write-Host "Installing VstsTaskSdk for $task"
            mkdir ps_modules -ErrorAction Stop | cd
            Save-Module -Name VstsTaskSdk -Path .
            $versionFolder = ls VstsTaskSdk | Move-Item -Destination . -PassThru -Force
            rm VstsTaskSdk
            $finalFolder = $versionFolder | Rename-Item -NewName VstsTaskSdk -PassThru -Force
            Write-Verbose "Wrote VstsTaskSdk to $finalFolder"
        }
    } finally {
        popd
    }
}

function Invoke-AllMochaTests([string[]]$tasks, [string]$reporter, [switch]$throwOnError) {
    Write-Host "Testing Tasks"

    $jobs = $tasks | % {
        Start-Job {
            cd $using:pwd
            Import-Module ./build/BuildFunctions.psm1 -ArgumentList $using:VerbosePreference
            Invoke-MochaTest -task $using:_ -reporter $using:reporter
        }
    }

    $allJobErrors = @()
    do {
        if ($jobs.Count -gt 1) {
            $jobs | Wait-Job -Any | Receive-Job -Wait -AutoRemoveJob -ErrorVariable jobErrors
        } else {
            # Stream the output of the longest test directly to the console.
            $jobs | Receive-Job -Wait -AutoRemoveJob -ErrorVariable jobErrors
        }
        $allJobErrors += $jobErrors
    } while ($jobs = Get-Job)

    if ($throwOnError -and $allJobErrors) {
        throw $allJobErrors
    }
}

function Invoke-MochaTest([string]$task, [string]$reporter) {
    Write-Host "Testing TypeScript task $task"
    pushd $task
    try {
        # nyc is the javascript code coverage checker.
        # mocha is the javascript test runner.
        $nycArgs = "--reporter", "json", "mocha"
        if ($reporter) {
            $nycArgs += "--reporter", $reporter
        }
        Write-Verbose "Running: nyc $nycArgs"
        nyc $nycArgs

        if ($LASTEXITCODE -ne 0) {
            throw "mocha failed for task $task"
        }
    } finally {
        popd
    }
}

function Send-Coverage() {
    Write-Host "Sending Code Coverage reports."
    $env:PATH = "C:\msys64\usr\bin;$env:PATH"
    Invoke-WebRequest -Uri 'https://codecov.io/bash' -OutFile codecov.sh
    bash codecov.sh
}

function Publish-TasksLocal([string[]]$tasks) {
    $jobs = $tasks | % {
        Start-Job {
            cd $using:pwd
            Import-Module ./build/BuildFunctions.psm1 -ArgumentList $using:VerbosePreference
            Publish-TsTaskLocal -task $using:_
        }
    }
    Publish-PsTaskLocal "install-cloud-sdk-build-task"
    $jobs | Wait-Job | Receive-Job -Wait -AutoRemoveJob
}

function Publish-PsTaskLocal($task) {
    Write-Host "Publishing PowerShell task $task to local build agent"
    pushd $task
    try {
        $version = Get-TaskVersion
        # Install build task to local tfs agent for rapid dev/test cycles.
        $agentTaskDir = [IO.Path]::Combine($env:TfsBuildAgentPath, "tasks", $task, $version)
        if (Test-Path $agentTaskDir) {
            Write-Verbose "Copying scripts for task $task to $agentTaskDir"
            # Excluded non-packaged files.
            $excludes = "obj", "bin", "test", ".taskkey", "*.psproj"
            cp * $agentTaskDir -Force -Recurse -Exclude $excludes
        }
    } finally {
        popd
    }
}

function Publish-TsTaskLocal($task) {
    Write-Host "Publishing TypeScript task $task to local build agent"
    pushd $task
    try {
        $version = Get-TaskVersion
        # Install build task to local tfs agent for rapid dev/test cycles.
        $agentTaskDir = [IO.Path]::Combine(
            $env:TfsBuildAgentPath, "tasks", $task, $version)
        if (Test-Path $agentTaskDir) {
            Write-Verbose "Copying scripts for task $task to $agentTaskDir"
            # Excluded non-packaged files.
            $excludes = "node_modules", "obj", "bin", "test", ".taskkey", "*.ts", "*.js.map", "package.json",
                "tsconfig.json", "manifest.json", "*.njsproj"
            cp * $agentTaskDir -Force -Recurse -Exclude $excludes

            $productionModules = Get-ProductionModules $task
            $agentTaskModulesDir = Join-Path $agentTaskDir node_modules
            $productionModules | % {
                $sourceDir = Join-Path node_modules $_
                Write-Verbose "cp $sourceDir $agentTaskModulesDir -Recurse -Force"
                cp $sourceDir $agentTaskModulesDir -Recurse -Force
            }
        }
    } finally {
        popd
    }
}

function Merge-ExtensionPackage([string] $publisher, [string] $version) {
    Write-Host "Building package"
    $tasks = Get-TypeScriptTasks
    $jobs = $tasks | % {
        Start-Job {
            cd $using:pwd
            Import-Module ./build/BuildFunctions.psm1 -ArgumentList $using:VerbosePreference
            Update-TaskBeforePackage -task $using:_
        }
    }
    $jobs | Wait-Job | Receive-Job -Wait -AutoRemoveJob

    $tfxArgs = "extension", "create", "--manifestGlobs", "**/manifest.json", "--output-path", "bin"
    $overrides = @{}
    if ($publisher) {
        $tfxArgs += "--publisher", $publisher
    }
    if ($version) {
        $overrides["version"] = $version
    }
    $overridesFile = Write-TempOverridesFile $overrides
    if ($overridesFile) {
        $tfxArgs += "--overrides-file", $overridesFile
    }
    Write-Verbose "Running: tfx $tfxArgs"
    tfx $tfxArgs
    if ($overridesFile) {
        rm $overridesFile
    }
}

function Write-TempOverridesFile($overrides) {
    if ($overrides.Count -gt 0) {
        $overridesFile = [System.IO.Path]::GetTempFileName()
        $overrideJson = $overrides | ConvertTo-Json
        # Avoids the byte order mark
        $enc = New-Object System.Text.UTF8Encoding
        [System.IO.File]::WriteAllLines($overridesFile, $overrideJson, $enc)
        return $overridesFile
    } else {
        return $false
    }
}

function Update-TaskBeforePackage([string]$task) {
    Write-Verbose "Running PrePackage tasks for $task"
    pushd $task
    try {
        cp ..\images\cloud_32x32.png icon.png

        # Get the modules needed for actually running the code.
        $productionModules = Get-ProductionModules

        # Create manifest.json in node_modules, so only production modules are
        # included in the final package.
        $productionModulePaths = $productionModules | %{ @{ "path" = $_ } }
        @{"files" = $productionModulePaths } | ConvertTo-Json |
            Out-File (Join-Path node_modules manifest.json) -Encoding utf8
    } finally {
        popd
    }
}

function Get-TaskVersion() {
    $taskConfig = Get-Content task.json | ConvertFrom-Json
    $parts = $taskConfig.version.PSObject.Properties | Sort Name
    return $parts.Value -join "."
}

function Get-ProductionModules() {
    Write-Debug "running npm ls --prod --parseable"
    ($root, $modulePaths) = npm ls --prod --parseable
    if(-not $root){
        throw "npm returned no results: $LASTEXITCODE"
    }
    $moduleRoot = Join-Path $root node_modules
    $moduleRoot += "\"
    foreach ($modulePath in $modulePaths) {
        if (!$modulePath.StartsWith($moduleRoot)) {
            throw "$modelPath does not start with $moduleRoot!"
        }
        Write-Output $modulePath.Substring($moduleRoot.Length)
    }
}

function Get-TypeScriptTasks() {
    $dirs = ls -Directory | ? {
        $fileNames = ls $_ -File | Split-Path -Leaf
        $fileNames -contains "task.json" -and $fileNames -contains "tsconfig.json"
    }
    $dirs.Name | Write-Output
}

function Update-AppveyorBuildVersion() {
    if (!$env:APPVEYOR) {
        Write-Error "Update-AppveyorBuildVersion is only avalable when running in Appveyor."
        return
    }

    if ([bool]::Parse($env:APPVEYOR_REPO_TAG)) {
        $manifest = Get-Content .\manifest.json | ConvertFrom-Json
        $manifestVersion = $manifest.version
        if($manifestVersion -ne $env:APPVEYOR_REPO_TAG_NAME){
            throw "Manifest version $manifestVersion does not equal tag version $env:APPVEYOR_REPO_TAG_NAME"
        }
        $version = "$env:APPVEYOR_REPO_TAG_NAME+$env:APPVEYOR_BUILD_NUMBER"
        Update-AppveyorBuild -Version $version
    }
}
