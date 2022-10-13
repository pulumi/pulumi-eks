import * as man from "./nodegroup";
import * as gen from "./schema-types";

const NodeGroupV21 = (x: man.NodeGroupV2): gen.NodeGroupV2 => x;
const NodeGroupV22 = (x: gen.NodeGroupV2): man.NodeGroupV2 => x;
// We should enable passing in an actual cluster
const NodeGroupOptions1 = (x: man.NodeGroupOptions): gen.NodeGroupV2Args => x;
const NodeGroupOptions2 = (x: gen.NodeGroupV2Args): man.NodeGroupOptions => x;
