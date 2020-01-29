import * as pulumi from "@pulumi/pulumi";

interface Config {
    createNodeGroup2xlarge: pulumi.Input<boolean>;
    desiredCapacity2xlarge: pulumi.Input<number>;

    createNodeGroup4xlarge: pulumi.Input<boolean>;
    desiredCapacity4xlarge: pulumi.Input<number>;

    deployWorkload: pulumi.Input<boolean>;
    nginxNodeSelectorTermValues: pulumi.Input<string>[];
}

// Migrate NGINX from the 2xlarge -> 4xlarge node group.
export const config: Config = {
    createNodeGroup2xlarge: true,
    desiredCapacity2xlarge: 3,
    createNodeGroup4xlarge: true,
    desiredCapacity4xlarge: 5,
    deployWorkload: true,
    nginxNodeSelectorTermValues: ["c5.4xlarge"],
};
