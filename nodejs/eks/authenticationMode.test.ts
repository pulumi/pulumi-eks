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

import {
    supportsConfigMap,
    supportsAccessEntries,
    validateAuthenticationMode,
} from "./authenticationMode";

describe("validateAuthenticationMode", () => {
    it("should throw an error for invalid authentication mode", () => {
        const args = {
            authenticationMode: "INVALID_MODE",
        };

        expect(() => validateAuthenticationMode(args)).toThrowError(
            "Invalid value for authenticationMode: INVALID_MODE. Allowed values are: CONFIG_MAP, API_AND_CONFIG_MAP, API.",
        );
    });

    it("should throw an error for roleMappings when authentication mode is set to API", () => {
        const args = {
            authenticationMode: "API",
            roleMappings: [
                {
                    roleArn: "roleArn",
                    groups: ["test-group"],
                    username: "test-role",
                },
            ],
        };

        expect(() => validateAuthenticationMode(args)).toThrowError(
            "The 'roleMappings' property is not supported when 'authenticationMode' is set to 'API'.",
        );
    });

    it("should throw an error for userMappings when authentication mode is set to API", () => {
        const args = {
            authenticationMode: "API",
            userMappings: [
                {
                    userArn: "userArn",
                    groups: ["test-group"],
                    username: "test-role",
                },
            ],
        };

        expect(() => validateAuthenticationMode(args)).toThrowError(
            "The 'userMappings' property is not supported when 'authenticationMode' is set to 'API'.",
        );
    });

    it("should throw an error for instanceRoles when authentication mode is set to API", () => {
        const args = {
            authenticationMode: "API",
            instanceRoles: ["roleArn"],
        };

        expect(() => validateAuthenticationMode(args)).toThrowError(
            "The 'instanceRoles' property is not supported when 'authenticationMode' is set to 'API'.",
        );
    });

    it("should throw an error for accessEntries when authentication mode is set to CONFIG_MAP", () => {
        const args = {
            authenticationMode: "CONFIG_MAP",
            accessEntries: [
                {
                    principalArn: "roleArn",
                },
            ],
        };

        expect(() => validateAuthenticationMode(args)).toThrowError(
            "The 'accessEntries' property is not supported when 'authenticationMode' is set to 'CONFIG_MAP'.",
        );
    });

    it("should throw an error for accessEntries when authentication mode is not set", () => {
        const args = {
            accessEntries: [
                {
                    principalArn: "roleArn",
                },
            ],
        };

        expect(() => validateAuthenticationMode(args)).toThrowError(
            "The 'accessEntries' property is not supported when 'authenticationMode' is not set.",
        );
    });

    test.each([
        [
            {
                authenticationMode: "CONFIG_MAP",
                roleMappings: [
                    {
                        roleArn: "roleArn",
                        groups: ["test-group"],
                        username: "test-role",
                    },
                ],
                userMappings: [
                    {
                        userArn: "userArn",
                        groups: ["test-group"],
                        username: "test-role",
                    },
                ],
                instanceRoles: ["roleArn"],
            },
        ],
        [
            {
                authenticationMode: "API_AND_CONFIG_MAP",
                roleMappings: [
                    {
                        roleArn: "roleArn",
                        groups: ["test-group"],
                        username: "test-role",
                    },
                ],
                userMappings: [
                    {
                        userArn: "userArn",
                        groups: ["test-group"],
                        username: "test-role",
                    },
                ],
                instanceRoles: ["roleArn"],
                accessEntries: [
                    {
                        principalArn: "roleArn",
                    },
                ],
            },
        ],
        [
            {
                authenticationMode: "API",
                accessEntries: [
                    {
                        principalArn: "roleArn",
                    },
                ],
            },
        ],
        [
            {
                authenticationMode: "API",
            },
        ],
        [
            {
                authenticationMode: "CONFIG_MAP",
            },
        ],
        [
            {
                authenticationMode: "API_AND_CONFIG_MAP",
            },
        ],
    ])("should not throw an error for valid authentication mode and properties", (args) => {
        expect(() => validateAuthenticationMode(args)).not.toThrow();
    });
});

describe("supportsConfigMap", () => {
    it("should return true when authenticationMode is undefined", () => {
        const authenticationMode = undefined;
        const result = supportsConfigMap(authenticationMode);
        expect(result).toBe(true);
    });

    it("should return true when authenticationMode is CONFIG_MAP", () => {
        const authenticationMode = "CONFIG_MAP";
        const result = supportsConfigMap(authenticationMode);
        expect(result).toBe(true);
    });

    it("should return true when authenticationMode is API_AND_CONFIG_MAP", () => {
        const authenticationMode = "API_AND_CONFIG_MAP";
        const result = supportsConfigMap(authenticationMode);
        expect(result).toBe(true);
    });

    it("should return false when authenticationMode is API", () => {
        const authenticationMode = "API";
        const result = supportsConfigMap(authenticationMode);
        expect(result).toBe(false);
    });
});

describe("supportsAccessEntries", () => {
    it("should return true when authenticationMode is API", () => {
        const authenticationMode = "API";
        const result = supportsAccessEntries(authenticationMode);
        expect(result).toBe(true);
    });

    it("should return true when authenticationMode is API_AND_CONFIG_MAP", () => {
        const authenticationMode = "API_AND_CONFIG_MAP";
        const result = supportsAccessEntries(authenticationMode);
        expect(result).toBe(true);
    });

    it("should return false when authenticationMode is CONFIG_MAP", () => {
        const authenticationMode = "CONFIG_MAP";
        const result = supportsAccessEntries(authenticationMode);
        expect(result).toBe(false);
    });

    it("should return false when authenticationMode is undefined", () => {
        const authenticationMode = undefined;
        const result = supportsAccessEntries(authenticationMode);
        expect(result).toBe(false);
    });
});
