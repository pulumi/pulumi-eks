// Copyright 2016-2022, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
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

import * as childProcess from "child_process";
import * as semver from "semver";
import * as which from "which";

const minAWSCLIV1Version = "1.24.0";
const minAWSCLIV2Version = "2.7.0";

export function assertCompatibleAWSCLIExists() {
    try {
        which.sync("aws");
    } catch (err) {
        throw new Error(
            "Could not find aws CLI for EKS. See https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html for installation instructions.",
        );
    }

    const awscli = childProcess.execSync(`aws --version`, {
        stdio: ["pipe", "pipe", "ignore"],
        encoding: "utf8",
    });
    const version = awscli.split(" ")[0].replace("aws-cli/", "");
    const semverCleaned = semver.clean(version, {
        loose: true,
    });
    switch (semver.major(semverCleaned!)) {
        case 1:
            if (semver.lt(semverCleaned!, minAWSCLIV1Version)) {
                throw new Error(
                    `At least v${minAWSCLIV1Version} of aws-cli is required.` +
                        ` Current version is: ${semverCleaned}. See https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html for installation instructions.`,
                );
            }
            break;
        default:
            if (semver.lt(semverCleaned!, minAWSCLIV2Version)) {
                throw new Error(
                    `At least v${minAWSCLIV2Version} of aws-cli is required.` +
                        ` Current version is: ${semverCleaned}. See https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html for installation instructions.`,
                );
            }
            break;
    }
}
