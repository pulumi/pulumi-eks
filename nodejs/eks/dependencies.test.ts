// Copyright 2016-2024, Pulumi Corporation.
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

import { assertCompatibleKubectlVersionExists, assertCompatibleAWSCLIExists } from "./dependencies";
import child_process from "child_process";
import which from "which";

jest.mock("child_process");
jest.mock("which");

function fakeKubectlVersionJson(v: string): string {
    return `{"clientVersion": {"gitVersion": "${v}"},"kustomizeVersion": "v5.0.4-0.20230601165947-6ce0bf390ce3"}`;
}

function fakeAwsVersion(v: string): string {
    return `aws-cli/${v} Python/3.8.8 Darwin/20.5.0 source/x86_64 prompt/off`;
}

describe("assertCompatibleKubectlVersionExists", () => {
    beforeEach(() => {
        (which.sync as jest.Mock).mockImplementation(() => "/fake/path/to/kubectl");
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it("should throw if kubectl is not installed", () => {
        (which.sync as jest.Mock).mockImplementation(() => {
            throw new Error("Not found");
        });

        expect(() => {
            assertCompatibleKubectlVersionExists();
        }).toThrow(
            "kubectl is missing. See https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl for installation instructions.",
        );

        expect(which.sync).toHaveBeenCalledWith("kubectl");
        expect(child_process.execSync).not.toHaveBeenCalled();
        expect(which.sync).toHaveBeenCalledTimes(1);
    });

    it("should throw if kubectl version is lower than v1.24.0", () => {
        (child_process.execSync as jest.Mock).mockImplementation(() =>
            fakeKubectlVersionJson("v1.23.0"),
        );

        expect(() => {
            assertCompatibleKubectlVersionExists();
        }).toThrow("At least v1.24.0 of kubectl is required.");

        expect(which.sync).toHaveBeenCalledWith("kubectl");
        expect(child_process.execSync).toHaveBeenCalledTimes(1);
    });

    it("should throw if kubectl version is invalid", () => {
        (child_process.execSync as jest.Mock).mockImplementation(() =>
            fakeKubectlVersionJson("fake-version"),
        );

        expect(() => {
            assertCompatibleKubectlVersionExists();
        }).toThrow("Invalid version");

        expect(which.sync).toHaveBeenCalledWith("kubectl");
        expect(child_process.execSync).toHaveBeenCalledTimes(1);
    });

    it("should not error if kubectl is v1.24.0", () => {
        (child_process.execSync as jest.Mock).mockImplementation(() =>
            fakeKubectlVersionJson("v1.24.0"),
        );

        expect(() => {
            assertCompatibleKubectlVersionExists();
        }).not.toThrow();

        expect(which.sync).toHaveBeenCalledWith("kubectl");
        expect(child_process.execSync).toHaveBeenCalledTimes(1);
    });

    it("should not error if kubectl is greater than v1.24.0", () => {
        (child_process.execSync as jest.Mock).mockImplementation(() =>
            fakeKubectlVersionJson("v1.29.6-gke.1400"),
        );

        expect(() => {
            assertCompatibleKubectlVersionExists();
        }).not.toThrow();

        expect(which.sync).toHaveBeenCalledWith("kubectl");
        expect(child_process.execSync).toHaveBeenCalledTimes(1);
    });
});

describe("assertCompatibleAWSCLIExists", () => {
    beforeEach(() => {
        (which.sync as jest.Mock).mockImplementation(() => "/fake/path/to/aws");
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it("should throw if aws is not installed", () => {
        (which.sync as jest.Mock).mockImplementation(() => {
            throw new Error("Not found");
        });

        expect(() => {
            assertCompatibleAWSCLIExists();
        }).toThrow("Could not find aws CLI for EKS.");

        expect(which.sync).toHaveBeenCalledWith("aws");
        expect(which.sync).toHaveBeenCalledTimes(1);
        expect(child_process.execSync).not.toHaveBeenCalled();
    });

    it("should throw if aws on major version 1, and less than minor version 24", () => {
        (child_process.execSync as jest.Mock).mockImplementation(() => fakeAwsVersion("1.18.0"));

        expect(() => {
            assertCompatibleAWSCLIExists();
        }).toThrow("At least v1.24.0 of aws-cli is required");

        expect(which.sync).toHaveBeenCalledWith("aws");
        expect(which.sync).toHaveBeenCalledTimes(1);
        expect(child_process.execSync).toHaveBeenCalledTimes(1);
    });

    it("should throw if aws on major version 2, and less than minor version 7", () => {
        (child_process.execSync as jest.Mock).mockImplementation(() => fakeAwsVersion("2.5.20"));

        expect(() => {
            assertCompatibleAWSCLIExists();
        }).toThrow("At least v2.7.0 of aws-cli is required");

        expect(which.sync).toHaveBeenCalledWith("aws");
        expect(which.sync).toHaveBeenCalledTimes(1);
        expect(child_process.execSync).toHaveBeenCalledTimes(1);
    });

    it("should not throw if aws on major version 1, and greater or equal than minor version 24", () => {
        (child_process.execSync as jest.Mock).mockImplementation(() => fakeAwsVersion("1.26.0"));

        expect(() => {
            assertCompatibleAWSCLIExists();
        }).not.toThrow();

        expect(which.sync).toHaveBeenCalledWith("aws");
        expect(which.sync).toHaveBeenCalledTimes(1);
        expect(child_process.execSync).toHaveBeenCalledTimes(1);
    });

    it("should not throw if aws on major version 2, and greater or equal than minor version 7", () => {
        (child_process.execSync as jest.Mock).mockImplementation(() => fakeAwsVersion("2.7.20"));

        expect(() => {
            assertCompatibleAWSCLIExists();
        }).not.toThrow();

        expect(which.sync).toHaveBeenCalledWith("aws");
        expect(which.sync).toHaveBeenCalledTimes(1);
        expect(child_process.execSync).toHaveBeenCalledTimes(1);
    });
});
