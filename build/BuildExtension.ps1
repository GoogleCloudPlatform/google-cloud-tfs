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

[CmdletBinding()]
Param([string[]] $TasksToBuild, [switch]$VerboseTest, [switch]$SkipTests, [switch]$SkipNpm)

$allTasks = (
    "deploy-gke-build-task",
    "container-build-task",
    "deploy-gae-build-task",
    "set-login-build-task"
)

if($TasksToBuild -eq $null) {
    $tasks = $allTasks
} else {
    $tasks = $allTasks | ? {$_ -in $TasksToBuild}
    $TasksToBuild |
        ? { $_ -notin $allTasks } |
        % { Write-Warning "$_ is not a valid task" }
}

function Run($buildScriptPath)
{
    pushd (Join-Path $buildScriptPath ..)
    try {
        cd ..

        if(Test-Path bin) {
            Write-Verbose "Removing bin"
            rm bin -Force -Recurse -ErrorAction Stop
        }

        BuildCommon
        InitPsTask "install-cloud-sdk-build-task"
        $tasks | % {
            BuildTask $_
        }

        Write-Host "Building package"
        Write-Verbose "Running: tfx extension create --output-path bin"
        tfx extension create --manifestGlobs **/manifest.json --output-path bin
        Write-Host "End build package"
    } finally {
        popd
    }
}

function BuildTask($task) {
    Write-Host "Building task $task"
    pushd $task
    try {
        if (!$SkipNpm) {
            Write-Verbose "Running: npm install"
            npm install
        }
        # Common module changes as part of development. Update the common module every time.
        npm install ../common | Out-Null

        Write-Verbose "Running: tsc"
        tsc

        if ($LASTEXITCODE -ne 0) {
            throw "tsc failed for task $task"
        }

        $testSuite = Join-Path Test _suite.js

        if (!$SkipTests -and (Test-path $testSuite)) {
            $oldEnvVar = $env:TASK_TEST_TRACE
            if ($VerboseTest) {
                $env:TASK_TEST_TRACE = $true
            }
            Write-Verbose "Running: mocha $testSuite"
            mocha $testSuite
            $env:TASK_TEST_TRACE = $oldEnvVar

            if ($LASTEXITCODE -ne 0) {
                throw "mocha failed  for task $task"
            }
        } else {
            Write-Warning "Skipping tests for task $task"
        }

        Write-Verbose "Copying icon.png"
        cp ..\images\cloud_32x32.png icon.png

        # Get the modules needed for actually running the code.
        $productionModules = (npm ls --prod --parseable | Split-Path -Leaf) -ne $task

        # Install build task to local tfs agent if it exists for rapid dev/test cycles.
        if (Test-Path env:TfsBuildAgentPath) {
            $agentTaskDir = [IO.Path]::Combine(
                $env:TfsBuildAgentPath, "tasks", $task, "0.0.1")
            if (Test-Path $agentTaskDir) {
                Write-Verbose "Copying scripts for task $task to $agentTaskDir"
                # Execuled non-packaged files.
                $excludes = "node_modules", "obj", "bin", "Test", ".taskkey", "*.ts", "*.js.map", "package.json",
                    "tsconfig.json", "manifest.json", "*.njsproj"
                cp * $agentTaskDir -Force -Recurse -Exclude $excludes

                $agentTaskModulesDir = Join-Path $agentTaskDir node_modules
                $productionModules | %{
                    $sourceDir = Join-Path node_modules $_
                    Write-Verbose "cp $sourceDir $agentTaskModulesDir -Recurse -Force"
                    cp $sourceDir $agentTaskModulesDir -Recurse -Force
                }
            }
        }

        # Create manifest.json in node_modules, so only production modules are
        # included in the final package.
        @{"files" = $productionModules | %{ @{"path"=$_} } } | ConvertTo-Json |
          Out-File (Join-Path node_modules manifest.json) -Encoding utf8
    } finally {
        popd
    }
    Write-Host "End build task $task"
}

function BuildCommon() {
    Write-Host "Building common modules"
    pushd common
    try {
        if (!$SkipNpm) {
            Write-Verbose "Running: npm install"
            npm install
        }

        Write-Verbose "Running: tsc"
        tsc
        if ($LASTEXITCODE -ne 0) {
            throw "tsc failed for common modules"
        }
    } finally {
        popd
    }
    Write-Host "End build common modules"
}

function InitPsTask($task) {
    pushd $task
    try {
        if (-not (Test-Path ps_modules)) {
            Write-Host "Start install VstsTaskSdk for $task"
            mkdir ps_modules
            cd ps_modules
            Save-Module -Name VstsTaskSdk -Path .
            $versionFolder = ls VstsTaskSdk
            $items = ls $versionFolder.FullName -Force
            Move-Item $items.FullName VstsTaskSdk
            rm $versionFolder.FullName
            Write-Host "End install VstsTaskSdk for $task"
        }
    } finally {
        popd
    }
}

Run $MyInvocation.MyCommand.Path
