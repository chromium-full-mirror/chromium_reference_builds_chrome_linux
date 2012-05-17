


WebInspector = {};
WebInspector.UIString = function(s) { return s; };




WebInspector.Uint32Array = function(size)
{
const preallocateSize = 1000;
size = size || preallocateSize;
this._usedSize = 0;
this._array = new Uint32Array(preallocateSize);
}

WebInspector.Uint32Array.prototype = {
push: function(value)
{
if (this._usedSize + 1 > this._array.length) {
var tempArray = new Uint32Array(this._array.length * 2);
tempArray.set(this._array);
this._array = tempArray;
}
this._array[this._usedSize++] = value;
},

get array()
{
return this._array.subarray(0, this._usedSize);
}
}


WebInspector.HeapSnapshotArraySlice = function(array, start, end)
{
this._array = array;
this._start = start;
this.length = end - start;
}

WebInspector.HeapSnapshotArraySlice.prototype = {
item: function(index)
{
return this._array[this._start + index];
},

slice: function(start, end)
{
if (typeof end === "undefined")
end = this.length;
return this._array.subarray(this._start + start, this._start + end);
}
}


WebInspector.HeapSnapshotEdge = function(snapshot, edges, edgeIndex)
{
this._snapshot = snapshot;
this._edges = edges;
this.edgeIndex = edgeIndex || 0;
}

WebInspector.HeapSnapshotEdge.prototype = {
clone: function()
{
return new WebInspector.HeapSnapshotEdge(this._snapshot, this._edges, this.edgeIndex);
},

get hasStringName()
{
if (!this.isShortcut)
return this._hasStringName;
return isNaN(parseInt(this._name, 10));
},

get isElement()
{
return this._type() === this._snapshot._edgeElementType;
},

get isHidden()
{
return this._type() === this._snapshot._edgeHiddenType;
},

get isWeak()
{
return this._type() === this._snapshot._edgeWeakType;
},

get isInternal()
{
return this._type() === this._snapshot._edgeInternalType;
},

get isInvisible()
{
return this._type() === this._snapshot._edgeInvisibleType;
},

get isShortcut()
{
return this._type() === this._snapshot._edgeShortcutType;
},

get name()
{
if (!this.isShortcut)
return this._name;
var numName = parseInt(this._name, 10);
return isNaN(numName) ? this._name : numName;
},

get node()
{
return new WebInspector.HeapSnapshotNode(this._snapshot, this.nodeIndex);
},

get nodeIndex()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeToNodeOffset);
},

get rawEdges()
{
return this._edges;
},

toString: function()
{
switch (this.type) {
case "context": return "->" + this.name;
case "element": return "[" + this.name + "]";
case "weak": return "[[" + this.name + "]]";
case "property":
return this.name.indexOf(" ") === -1 ? "." + this.name : "[\"" + this.name + "\"]";
case "shortcut":
var name = this.name;
if (typeof name === "string")
return this.name.indexOf(" ") === -1 ? "." + this.name : "[\"" + this.name + "\"]";
else
return "[" + this.name + "]";
case "internal":
case "hidden":
case "invisible":
return "{" + this.name + "}";
};
return "?" + this.name + "?";
},

get type()
{
return this._snapshot._edgeTypes[this._type()];
},

get _hasStringName()
{
return !this.isElement && !this.isHidden && !this.isWeak;
},

get _name()
{
return this._hasStringName ? this._snapshot._strings[this._nameOrIndex] : this._nameOrIndex;
},

get _nameOrIndex()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeNameOffset);
},

_type: function()
{
return this._edges.item(this.edgeIndex + this._snapshot._edgeTypeOffset);
}
};


WebInspector.HeapSnapshotEdgeIterator = function(edge)
{
this.edge = edge;
}

WebInspector.HeapSnapshotEdgeIterator.prototype = {
first: function()
{
this.edge.edgeIndex = 0;
},

hasNext: function()
{
return this.edge.edgeIndex < this.edge._edges.length;
},

get index()
{
return this.edge.edgeIndex;
},

set index(newIndex)
{
this.edge.edgeIndex = newIndex;
},

get item()
{
return this.edge;
},

next: function()
{
this.edge.edgeIndex += this.edge._snapshot._edgeFieldsCount;
}
};


WebInspector.HeapSnapshotRetainerEdge = function(snapshot, retainedNodeIndex, retainerIndex)
{
this._snapshot = snapshot;
this._retainedNodeIndex = retainedNodeIndex;

var retainedNodeOrdinal = retainedNodeIndex / snapshot._nodeFieldCount;
this._firstRetainer = snapshot._firstRetainerIndex[retainedNodeOrdinal];
this._retainersCount = snapshot._firstRetainerIndex[retainedNodeOrdinal + 1] - this._firstRetainer;

this.retainerIndex = retainerIndex;
}

WebInspector.HeapSnapshotRetainerEdge.prototype = {
clone: function()
{
return new WebInspector.HeapSnapshotRetainerEdge(this._snapshot, this._retainedNodeIndex, this.retainerIndex);
},

get hasStringName()
{
return this._edge.hasStringName;
},

get isElement()
{
return this._edge.isElement;
},

get isHidden()
{
return this._edge.isHidden;
},

get isInternal()
{
return this._edge.isInternal;
},

get isInvisible()
{
return this._edge.isInvisible;
},

get isShortcut()
{
return this._edge.isShortcut;
},

get isWeak()
{
return this._edge.isWeak;
},

get name()
{
return this._edge.name;
},

get node()
{
return this._node;
},

get nodeIndex()
{
return this._nodeIndex;
},

get retainerIndex()
{
return this._retainerIndex;
},

set retainerIndex(newIndex)
{
if (newIndex !== this._retainerIndex) {
this._retainerIndex = newIndex;
this.edgeIndex = newIndex;
}
},

set edgeIndex(edgeIndex)
{
var retainerIndex = this._firstRetainer + edgeIndex;
this._globalEdgeIndex = this._snapshot._retainingEdges[retainerIndex];
this._nodeIndex = this._snapshot._retainingNodes[retainerIndex];
delete this._edgeInstance;
delete this._nodeInstance;
},

get _node()
{
if (!this._nodeInstance)
this._nodeInstance = new WebInspector.HeapSnapshotNode(this._snapshot, this._nodeIndex);
return this._nodeInstance;
},

get _edge()
{
if (!this._edgeInstance) {
var edgeIndex = this._globalEdgeIndex - this._node._edgeIndexesStart();
this._edgeInstance = new WebInspector.HeapSnapshotEdge(this._snapshot, this._node.rawEdges, edgeIndex);
}
return this._edgeInstance;
},

toString: function()
{
return this._edge.toString();
},

get type()
{
return this._edge.type;
}
}


WebInspector.HeapSnapshotRetainerEdgeIterator = function(retainer)
{
this.retainer = retainer;
}

WebInspector.HeapSnapshotRetainerEdgeIterator.prototype = {
first: function()
{
this.retainer.retainerIndex = 0;
},

hasNext: function()
{
return this.retainer.retainerIndex < this.retainer._retainersCount;
},

get index()
{
return this.retainer.retainerIndex;
},

set index(newIndex)
{
this.retainer.retainerIndex = newIndex;
},

get item()
{
return this.retainer;
},

next: function()
{
++this.retainer.retainerIndex;
}
};


WebInspector.HeapSnapshotNode = function(snapshot, nodeIndex)
{
this._snapshot = snapshot;
this._firstNodeIndex = nodeIndex;
this.nodeIndex = nodeIndex;
}

WebInspector.HeapSnapshotNode.prototype = {
get canBeQueried()
{
var flags = this._snapshot._flagsOfNode(this);
return !!(flags & this._snapshot._nodeFlags.canBeQueried);
},

get distanceToWindow()
{
return this._snapshot._distancesToWindow[this.nodeIndex];
},

get className()
{
switch (this.type) {
case "hidden":
return WebInspector.UIString("(system)");
case "object":
case "native":
return this.name;
case "code":
return WebInspector.UIString("(compiled code)");
default:
return "(" + this.type + ")";
}
},

get classIndex()
{
var type = this._type();
switch (type) {
case this._snapshot._nodeObjectType:
case this._snapshot._nodeNativeType:
return this._name();
default:
return -1 - type;
}
},

get dominatorIndex()
{
return this._nodes[this.nodeIndex + this._snapshot._dominatorOffset];
},

get edges()
{
return new WebInspector.HeapSnapshotEdgeIterator(new WebInspector.HeapSnapshotEdge(this._snapshot, this.rawEdges));
},

get edgesCount()
{
return (this._edgeIndexesEnd() - this._edgeIndexesStart()) / this._snapshot._edgeFieldsCount;
},

get flags()
{
return this._snapshot._flagsOfNode(this);
},

get id()
{
return this._nodes[this.nodeIndex + this._snapshot._nodeIdOffset];
},

get isHidden()
{
return this._type() === this._snapshot._nodeHiddenType;
},

get isNative()
{
return this._type() === this._snapshot._nodeNativeType;
},

get isSynthetic()
{
return this._type() === this._snapshot._nodeSyntheticType;
},

get isWindow()
{
const windowRE = /^Window/;
return windowRE.test(this.name);
},

get isDetachedDOMTreesRoot()
{
return this.name === "(Detached DOM trees)";
},

get isDetachedDOMTree()
{
const detachedDOMTreeRE = /^Detached DOM tree/;
return detachedDOMTreeRE.test(this.className);
},

get isRoot()
{
return this.nodeIndex === this._snapshot._rootNodeIndex;
},

get name()
{
return this._snapshot._strings[this._name()];
},

get rawEdges()
{
return new WebInspector.HeapSnapshotArraySlice(this._snapshot._containmentEdges, this._edgeIndexesStart(), this._edgeIndexesEnd());
},

get retainedSize()
{
return this._nodes[this.nodeIndex + this._snapshot._nodeRetainedSizeOffset];
},

get retainers()
{
return new WebInspector.HeapSnapshotRetainerEdgeIterator(new WebInspector.HeapSnapshotRetainerEdge(this._snapshot, this.nodeIndex, 0));
},

get selfSize()
{
return this._nodes[this.nodeIndex + this._snapshot._nodeSelfSizeOffset];
},

get type()
{
return this._snapshot._nodeTypes[this._type()];
},

_name: function()
{
return this._nodes[this.nodeIndex + this._snapshot._nodeNameOffset];
},

get _nodes()
{
return this._snapshot._nodes;
},

_edgeIndexesStart: function()
{
return this._snapshot._nodes[this.nodeIndex + this._snapshot._firstEdgeIndexOffset];
},

_edgeIndexesEnd: function()
{
var nextNodeIndex = this._nextNodeIndex;
if (nextNodeIndex < this._snapshot._nodes.length)
return this._snapshot._nodes[nextNodeIndex + this._snapshot._firstEdgeIndexOffset]
return this._snapshot._containmentEdges.length;
},

get _nextNodeIndex()
{
return this.nodeIndex + this._snapshot._nodeFieldCount;
},

_type: function()
{
return this._nodes[this.nodeIndex + this._snapshot._nodeTypeOffset];
}
};


WebInspector.HeapSnapshotNodeIterator = function(node)
{
this.node = node;
}

WebInspector.HeapSnapshotNodeIterator.prototype = {
first: function()
{
this.node.nodeIndex = this.node._firstNodeIndex;
},

hasNext: function()
{
return this.node.nodeIndex < this.node._nodes.length;
},

get index()
{
return this.node.nodeIndex;
},

set index(newIndex)
{
this.node.nodeIndex = newIndex;
},

get item()
{
return this.node;
},

next: function()
{
this.node.nodeIndex = this.node._nextNodeIndex;
}
}


WebInspector.HeapSnapshot = function(profile)
{
this.uid = profile.snapshot.uid;
this._nodes = profile.nodes;
this._containmentEdges = profile.edges;

this._metaNode = profile.snapshot.meta;
this._strings = profile.strings;

this._snapshotDiffs = {};
this._aggregatesForDiff = null;

this._init();
}


function HeapSnapshotMetainfo()
{

this.node_fields = [];
this.node_types = [];
this.edge_fields = [];
this.edge_types = [];


this.fields = [];
this.types = [];
}


function HeapSnapshotHeader()
{

this.title = "";
this.uid = 0;
this.meta = new HeapSnapshotMetainfo();
this.node_count = 0;
this.edge_count = 0;
}

WebInspector.HeapSnapshot.prototype = {
_init: function()
{
var meta = this._metaNode;
this._rootNodeIndex = 0;

this._nodeTypeOffset = meta.node_fields.indexOf("type");
this._nodeNameOffset = meta.node_fields.indexOf("name");
this._nodeIdOffset = meta.node_fields.indexOf("id");
this._nodeSelfSizeOffset = meta.node_fields.indexOf("self_size");
this._nodeRetainedSizeOffset = meta.node_fields.indexOf("retained_size");
this._dominatorOffset = meta.node_fields.indexOf("dominator");
this._firstEdgeIndexOffset = meta.node_fields.indexOf("edges_index");
this._nodeFieldCount = meta.node_fields.length;

this._nodeTypes = meta.node_types[this._nodeTypeOffset];
this._nodeHiddenType = this._nodeTypes.indexOf("hidden");
this._nodeObjectType = this._nodeTypes.indexOf("object");
this._nodeNativeType = this._nodeTypes.indexOf("native");
this._nodeCodeType = this._nodeTypes.indexOf("code");
this._nodeSyntheticType = this._nodeTypes.indexOf("synthetic");

this._edgeFieldsCount = meta.edge_fields.length;
this._edgeTypeOffset = meta.edge_fields.indexOf("type");
this._edgeNameOffset = meta.edge_fields.indexOf("name_or_index");
this._edgeToNodeOffset = meta.edge_fields.indexOf("to_node");

this._edgeTypes = meta.edge_types[this._edgeTypeOffset];
this._edgeTypes.push("invisible");
this._edgeElementType = this._edgeTypes.indexOf("element");
this._edgeHiddenType = this._edgeTypes.indexOf("hidden");
this._edgeInternalType = this._edgeTypes.indexOf("internal");
this._edgeShortcutType = this._edgeTypes.indexOf("shortcut");
this._edgeWeakType = this._edgeTypes.indexOf("weak");
this._edgeInvisibleType = this._edgeTypes.indexOf("invisible");

this._nodeFlags = { 
canBeQueried: 1,
detachedDOMTreeNode: 2,
};

this.nodeCount = this._nodes.length / this._nodeFieldCount;
this._edgeCount = this._containmentEdges.length / this._edgeFieldsCount;

this._markInvisibleEdges();
this._buildRetainers();
if (this._dominatorOffset !== -1) 
this._buildDominatedNodes()
this._calculateFlags();
this._calculateObjectToWindowDistance();
},

_buildRetainers: function()
{
var retainingNodes = this._retainingNodes = new Uint32Array(this._edgeCount);
var retainingEdges = this._retainingEdges = new Uint32Array(this._edgeCount);


var firstRetainerIndex = this._firstRetainerIndex = new Uint32Array(this.nodeCount + 1);

var containmentEdges = this._containmentEdges;
var edgeFieldsCount = this._edgeFieldsCount;
var nodeFieldCount = this._nodeFieldCount;
var edgeToNodeOffset = this._edgeToNodeOffset;
var nodes = this._nodes;
var firstEdgeIndexOffset = this._firstEdgeIndexOffset;

for (var toNodeFieldIndex = edgeToNodeOffset, l = containmentEdges.length; toNodeFieldIndex < l; toNodeFieldIndex += edgeFieldsCount) {
var toNodeIndex = containmentEdges[toNodeFieldIndex];
if (toNodeIndex % nodeFieldCount)
throw new Error("Invalid toNodeIndex " + toNodeIndex);
++firstRetainerIndex[toNodeIndex / nodeFieldCount];
}
for (var i = 0, firstUnusedRetainerSlot = 0, l = this.nodeCount; i < l; i++) {
var retainersCount = firstRetainerIndex[i];
firstRetainerIndex[i] = firstUnusedRetainerSlot;
retainingNodes[firstUnusedRetainerSlot] = retainersCount;
firstUnusedRetainerSlot += retainersCount;
}
firstRetainerIndex[this.nodeCount] = retainingNodes.length;

var srcNodeIndex = 0;
var nextNodeFirstEdgeIndex = nodes[firstEdgeIndexOffset];
var nodesLength = nodes.length;
while (srcNodeIndex < nodesLength) {
var firstEdgeIndex = nextNodeFirstEdgeIndex;
var nextNodeIndex = srcNodeIndex + nodeFieldCount;
nextNodeFirstEdgeIndex = nextNodeIndex < nodesLength
? nodes[nextNodeIndex + firstEdgeIndexOffset]
: containmentEdges.length;
for (var edgeIndex = firstEdgeIndex; edgeIndex < nextNodeFirstEdgeIndex; edgeIndex += edgeFieldsCount) {
var toNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
if (toNodeIndex % nodeFieldCount)
throw new Error("Invalid toNodeIndex " + toNodeIndex);
var firstRetainerSlotIndex = firstRetainerIndex[toNodeIndex / nodeFieldCount];
var nextUnusedRetainerSlotIndex = firstRetainerSlotIndex + (--retainingNodes[firstRetainerSlotIndex]);
retainingNodes[nextUnusedRetainerSlotIndex] = srcNodeIndex;
retainingEdges[nextUnusedRetainerSlotIndex] = edgeIndex;
}
srcNodeIndex = nextNodeIndex;
}
},

dispose: function()
{
delete this._nodes;
delete this._strings;
delete this._retainingEdges;
delete this._retainingNodes;
delete this._firstRetainerIndex;
if (this._aggregates) {
delete this._aggregates;
delete this._aggregatesSortedFlags;
}
delete this._dominatedNodes;
delete this._firstDominatedNodeIndex;
delete this._flags;
delete this._distancesToWindow;
},

get _allNodes()
{
return new WebInspector.HeapSnapshotNodeIterator(this.rootNode);
},

get rootNode()
{
return new WebInspector.HeapSnapshotNode(this, this._rootNodeIndex);
},

get rootNodeIndex()
{
return this._rootNodeIndex;
},

get totalSize()
{
return this.rootNode.retainedSize;
},

_getDominatedIndex: function(nodeIndex)
{
if (nodeIndex % this._nodeFieldCount)
throw new Error("Invalid nodeIndex: " + nodeIndex);
return this._firstDominatedNodeIndex[nodeIndex / this._nodeFieldCount];
},

_dominatedNodesOfNode: function(node)
{
var dominatedIndexFrom = this._getDominatedIndex(node.nodeIndex);
var dominatedIndexTo = this._getDominatedIndex(node._nextNodeIndex);
return new WebInspector.HeapSnapshotArraySlice(this._dominatedNodes, dominatedIndexFrom, dominatedIndexTo);
},

_flagsOfNode: function(node)
{
return this._flags[node.nodeIndex];
},


aggregates: function(sortedIndexes, key, filterString)
{
if (!this._aggregates) {
this._aggregates = {};
this._aggregatesSortedFlags = {};
}

var aggregatesByClassName = this._aggregates[key];
if (aggregatesByClassName) {
if (sortedIndexes && !this._aggregatesSortedFlags[key]) {
this._sortAggregateIndexes(aggregatesByClassName);
this._aggregatesSortedFlags[key] = sortedIndexes;
}
return aggregatesByClassName;
}

var filter;
if (filterString)
filter = this._parseFilter(filterString);

var aggregates = this._buildAggregates(filter);
this._calculateClassesRetainedSize(aggregates.aggregatesByClassIndex, filter);
aggregatesByClassName = aggregates.aggregatesByClassName;

if (sortedIndexes)
this._sortAggregateIndexes(aggregatesByClassName);

this._aggregatesSortedFlags[key] = sortedIndexes;
this._aggregates[key] = aggregatesByClassName;

return aggregatesByClassName;
},

aggregatesForDiff: function()
{
if (this._aggregatesForDiff)
return this._aggregatesForDiff;

var aggregatesByClassName = this.aggregates(true, "allObjects");
this._aggregatesForDiff  = {};

var node = new WebInspector.HeapSnapshotNode(this);
for (var className in aggregatesByClassName) {
var aggregate = aggregatesByClassName[className];
var indexes = aggregate.idxs;
var ids = new Array(indexes.length);
var selfSizes = new Array(indexes.length);
for (var i = 0; i < indexes.length; i++) {
node.nodeIndex = indexes[i];
ids[i] = node.id;
selfSizes[i] = node.selfSize;
}

this._aggregatesForDiff[className] = {
indexes: indexes,
ids: ids,
selfSizes: selfSizes
};
}
return this._aggregatesForDiff;
},

_calculateObjectToWindowDistance: function()
{
this._distancesToWindow = new Array(this.nodeCount);


var list = [];
for (var iter = this.rootNode.edges; iter.hasNext(); iter.next()) {
var node = iter.edge.node;
if (node.isWindow) {
if (node.nodeIndex % this._nodeFieldCount)
throw new Error("Invalid nodeIndex: " + node.nodeIndex);
list.push(node.nodeIndex);
this._distancesToWindow[node.nodeIndex] = 0;
}
}
this._bfs(list);


list = [];
list.push(this._rootNodeIndex);
this._distancesToWindow[this._rootNodeIndex] = 0;
this._bfs(list);
},

_bfs: function(list)
{

var edgeFieldsCount = this._edgeFieldsCount;
var containmentEdges = this._containmentEdges;
var nodeFieldCount = this._nodeFieldCount;
var firstEdgeIndexOffset = this._firstEdgeIndexOffset;
var edgeToNodeOffset = this._edgeToNodeOffset;
var distancesToWindow = this._distancesToWindow;
var nodes = this._nodes;

var index = 0;
while (index < list.length) {
var nodeIndex = list[index++]; 
if (index > 100000) {
list = list.slice(index);
index = 0;
}
var distance = distancesToWindow[nodeIndex] + 1;

var firstEdgeIndex = nodes[nodeIndex + firstEdgeIndexOffset];
var edgesEnd = nodeIndex < nodes.length
? nodes[nodeIndex + nodeFieldCount + firstEdgeIndexOffset]
: containmentEdges.length;
for (var edgeToNodeIndex = firstEdgeIndex + edgeToNodeOffset; edgeToNodeIndex < edgesEnd; edgeToNodeIndex += edgeFieldsCount) {
var childNodeIndex = containmentEdges[edgeToNodeIndex];
if (childNodeIndex % nodeFieldCount)
throw new Error("Invalid childNodeIndex: " + childNodeIndex);
if (childNodeIndex in distancesToWindow)
continue;
distancesToWindow[childNodeIndex] = distance;
list.push(childNodeIndex);
}
}
},

_buildAggregates: function(filter)
{
var aggregates = {};
var aggregatesByClassName = {};
var nodes = this._nodes;
var nodesLength = nodes.length;
var nodeNativeType = this._nodeNativeType;
var nodeFieldsCount = this._nodeFieldCount;
var selfSizeOffset = this._nodeSelfSizeOffset;
var nodeTypeOffset = this._nodeTypeOffset;
var node = new WebInspector.HeapSnapshotNode(this, this._rootNodeIndex);
var distancesToWindow = this._distancesToWindow;

for (var nodeIndex = this._rootNodeIndex; nodeIndex < nodesLength; nodeIndex += nodeFieldsCount) {
node.nodeIndex = nodeIndex;
var selfSize = nodes[nodeIndex + selfSizeOffset];
if (filter && !filter(node))
continue;
if (!selfSize && nodes[nodeIndex + nodeTypeOffset] !== nodeNativeType)
continue;
var classIndex = node.classIndex;
if (!(classIndex in aggregates)) {
var nodeType = node.type;
var nameMatters = nodeType === "object" || nodeType === "native";
var value = {
count: 1,
distanceToWindow: distancesToWindow[nodeIndex],
self: selfSize,
maxRet: 0,
type: nodeType,
name: nameMatters ? node.name : null,
idxs: [nodeIndex]
};
aggregates[classIndex] = value;
aggregatesByClassName[node.className] = value;
} else {
var clss = aggregates[classIndex];
clss.distanceToWindow = Math.min(clss.distanceToWindow, distancesToWindow[nodeIndex]);
++clss.count;
clss.self += selfSize;
clss.idxs.push(nodeIndex);
}
}


for (var classIndex in aggregates)
aggregates[classIndex].idxs = aggregates[classIndex].idxs.slice(0);
return {aggregatesByClassName: aggregatesByClassName, aggregatesByClassIndex: aggregates};
},

_calculateClassesRetainedSize: function(aggregates, filter)
{
var rootNodeIndex = this._rootNodeIndex;
var node = new WebInspector.HeapSnapshotNode(this, rootNodeIndex);
var list = [rootNodeIndex];
var sizes = [-1];
var classes = [];
var seenClassNameIndexes = {};
var nodeFieldCount = this._nodeFieldCount;
var nodeTypeOffset = this._nodeTypeOffset;
var nodeNativeType = this._nodeNativeType;
var dominatedNodes = this._dominatedNodes;
var nodes = this._nodes;
var firstDominatedNodeIndex = this._firstDominatedNodeIndex;

while (list.length) {
var nodeIndex = list.pop();
node.nodeIndex = nodeIndex;
var classIndex = node.classIndex;
var seen = !!seenClassNameIndexes[classIndex];
var nodeOrdinal = nodeIndex / nodeFieldCount;
var dominatedIndexFrom = firstDominatedNodeIndex[nodeOrdinal];
var dominatedIndexTo = firstDominatedNodeIndex[nodeOrdinal + 1];

if (!seen &&
(!filter || filter(node)) &&
(node.selfSize || nodes[nodeIndex + nodeTypeOffset] === nodeNativeType)
) {
aggregates[classIndex].maxRet += node.retainedSize;
if (dominatedIndexFrom !== dominatedIndexTo) {
seenClassNameIndexes[classIndex] = true;
sizes.push(list.length);
classes.push(classIndex);
}
}
for (var i = dominatedIndexFrom; i < dominatedIndexTo; i++)
list.push(dominatedNodes[i]);

var l = list.length;
while (sizes[sizes.length - 1] === l) {
sizes.pop();
classIndex = classes.pop();
seenClassNameIndexes[classIndex] = false;
}
}
},

_sortAggregateIndexes: function(aggregates)
{
var nodeA = new WebInspector.HeapSnapshotNode(this);
var nodeB = new WebInspector.HeapSnapshotNode(this);
for (var clss in aggregates)
aggregates[clss].idxs.sort(
function(idxA, idxB) {
nodeA.nodeIndex = idxA;
nodeB.nodeIndex = idxB;
return nodeA.id < nodeB.id ? -1 : 1;
});
},

_buildDominatedNodes: function()
{





var indexArray = this._firstDominatedNodeIndex = new Uint32Array(this.nodeCount + 1);

var dominatedNodes = this._dominatedNodes = new Uint32Array(this.nodeCount - 1);



for (var nodeIndex = this._nodeFieldCount; nodeIndex < this._nodes.length; nodeIndex += this._nodeFieldCount) {
var dominatorIndex = this._nodes[nodeIndex + this._dominatorOffset];
if (dominatorIndex % this._nodeFieldCount)
throw new Error("Wrong dominatorIndex " + dominatorIndex + " nodeIndex = " + nodeIndex + " nodeCount = " + this.nodeCount);
++indexArray[dominatorIndex / this._nodeFieldCount];
}


var firstDominatedNodeIndex = 0;
for (var i = 0; i < this.nodeCount; ++i) {
var dominatedCount = dominatedNodes[firstDominatedNodeIndex] = indexArray[i];
indexArray[i] = firstDominatedNodeIndex;
firstDominatedNodeIndex += dominatedCount;
}
indexArray[this.nodeCount] = dominatedNodes.length;


for (var nodeIndex = this._nodeFieldCount; nodeIndex < this._nodes.length; nodeIndex += this._nodeFieldCount) {
var dominatorIndex = this._nodes[nodeIndex + this._dominatorOffset];
if (dominatorIndex % this._nodeFieldCount)
throw new Error("Wrong dominatorIndex " + dominatorIndex);
var dominatorPos = dominatorIndex / this._nodeFieldCount;
var dominatedRefIndex = indexArray[dominatorPos];
dominatedRefIndex += (--dominatedNodes[dominatedRefIndex]);
dominatedNodes[dominatedRefIndex] = nodeIndex;
}
},

_markInvisibleEdges: function()
{



for (var iter = this.rootNode.edges; iter.hasNext(); iter.next()) {
var edge = iter.edge;
if (!edge.isShortcut)
continue;
var node = edge.node;
var propNames = {};
for (var innerIter = node.edges; innerIter.hasNext(); innerIter.next()) {
var globalObjEdge = innerIter.edge;
if (globalObjEdge.isShortcut)
propNames[globalObjEdge._nameOrIndex] = true;
}
for (innerIter.first(); innerIter.hasNext(); innerIter.next()) {
var globalObjEdge = innerIter.edge;
if (!globalObjEdge.isShortcut
&& globalObjEdge.node.isHidden
&& globalObjEdge._hasStringName
&& (globalObjEdge._nameOrIndex in propNames))
this._containmentEdges[globalObjEdge._edges._start + globalObjEdge.edgeIndex + this._edgeTypeOffset] = this._edgeInvisibleType;
}
}
},

_numbersComparator: function(a, b)
{
return a < b ? -1 : (a > b ? 1 : 0);
},

_markDetachedDOMTreeNodes: function()
{
var flag = this._nodeFlags.detachedDOMTreeNode;
var detachedDOMTreesRoot;
for (var iter = this.rootNode.edges; iter.hasNext(); iter.next()) {
var node = iter.edge.node;
if (node.isDetachedDOMTreesRoot) {
detachedDOMTreesRoot = node;
break;
}
}

if (!detachedDOMTreesRoot)
return;

for (var iter = detachedDOMTreesRoot.edges; iter.hasNext(); iter.next()) {
var node = iter.edge.node;
if (node.isDetachedDOMTree) {
for (var edgesIter = node.edges; edgesIter.hasNext(); edgesIter.next())
this._flags[edgesIter.edge.node.nodeIndex] |= flag;
}
}
},

_markQueriableHeapObjects: function()
{



var flag = this._nodeFlags.canBeQueried;

var list = [];
for (var iter = this.rootNode.edges; iter.hasNext(); iter.next()) {
if (iter.edge.node.isWindow)
list.push(iter.edge.node.nodeIndex);
}

var edge = new WebInspector.HeapSnapshotEdge(this, undefined);
var node = new WebInspector.HeapSnapshotNode(this);
while (list.length) {
var nodeIndex = list.pop();
if (this._flags[nodeIndex] & flag)
continue;
node.nodeIndex = nodeIndex;
this._flags[nodeIndex] |= flag;
var edgesCount = node.edgesCount;
edge._edges = node.rawEdges;
for (var j = 0; j < edgesCount; ++j) {
edge.edgeIndex = j * this._edgeFieldsCount;
nodeIndex = edge.nodeIndex;
if (this._flags[nodeIndex] & flag)
continue;
if (edge.isHidden || edge.isInvisible)
continue;
if (edge.isInternal)
continue;
var name = edge.name;
if (!name)
continue;
list.push(nodeIndex);
}
}
},

_calculateFlags: function()
{
this._flags = new Array(this.nodeCount);
this._markDetachedDOMTreeNodes();
this._markQueriableHeapObjects();
},

calculateSnapshotDiff: function(baseSnapshotId, baseSnapshotAggregates)
{
var snapshotDiff = this._snapshotDiffs[baseSnapshotId];
if (snapshotDiff)
return snapshotDiff;
snapshotDiff = {};

var aggregates = this.aggregates(true, "allObjects");
for (var className in baseSnapshotAggregates) {
var baseAggregate = baseSnapshotAggregates[className];
var diff = this._calculateDiffForClass(baseAggregate, aggregates[className]);
if (diff)
snapshotDiff[className] = diff;
}
var emptyBaseAggregate = { ids: [], indexes: [], selfSizes: [] };
for (var className in aggregates) {
if (className in baseSnapshotAggregates)
continue;
snapshotDiff[className] = this._calculateDiffForClass(emptyBaseAggregate, aggregates[className]);
}

this._snapshotDiffs[baseSnapshotId] = snapshotDiff;
return snapshotDiff;
},

_calculateDiffForClass: function(baseAggregate, aggregate)
{
var baseIds = baseAggregate.ids;
var baseIndexes = baseAggregate.indexes;
var baseSelfSizes = baseAggregate.selfSizes;

var indexes = aggregate ? aggregate.idxs : [];

var i = 0, l = baseIds.length;
var j = 0, m = indexes.length;
var diff = { addedCount: 0,
removedCount: 0,
addedSize: 0,
removedSize: 0,
deletedIndexes: [],
addedIndexes: [] };

var nodeB = new WebInspector.HeapSnapshotNode(this, indexes[j]);
while (i < l && j < m) {
var nodeAId = baseIds[i];
if (nodeAId < nodeB.id) {
diff.deletedIndexes.push(baseIndexes[i]);
diff.removedCount++;
diff.removedSize += baseSelfSizes[i];
++i;
} else if (nodeAId > nodeB.id) { 
diff.addedIndexes.push(indexes[j]);
diff.addedCount++;
diff.addedSize += nodeB.selfSize;
nodeB.nodeIndex = indexes[++j];
} else { 
++i;
nodeB.nodeIndex = indexes[++j];
}
}
while (i < l) {
diff.deletedIndexes.push(baseIndexes[i]);
diff.removedCount++;
diff.removedSize += baseSelfSizes[i];
++i;
}
while (j < m) {
diff.addedIndexes.push(indexes[j]);
diff.addedCount++;
diff.addedSize += nodeB.selfSize;
nodeB.nodeIndex = indexes[++j];
}
diff.countDelta = diff.addedCount - diff.removedCount;
diff.sizeDelta = diff.addedSize - diff.removedSize;
if (!diff.addedCount && !diff.removedCount)
return null;
return diff;
},

_nodeForSnapshotObjectId: function(snapshotObjectId)
{
for (var it = this._allNodes; it.hasNext(); it.next()) {
if (it.node.id === snapshotObjectId)
return it.node;
}
return null;
},

nodeClassName: function(snapshotObjectId)
{
var node = this._nodeForSnapshotObjectId(snapshotObjectId);
if (node)
return node.className;
return null;
},

dominatorIdsForNode: function(snapshotObjectId)
{
var node = this._nodeForSnapshotObjectId(snapshotObjectId);
if (!node)
return null;
var result = [];
while (!node.isRoot) {
result.push(node.id);
node.nodeIndex = node.dominatorIndex;
}
return result;
},

_parseFilter: function(filter)
{
if (!filter)
return null;
var parsedFilter = eval("(function(){return " + filter + "})()");
return parsedFilter.bind(this);
},

createEdgesProvider: function(nodeIndex, filter)
{
var node = new WebInspector.HeapSnapshotNode(this, nodeIndex);
return new WebInspector.HeapSnapshotEdgesProvider(this, this._parseFilter(filter), node.edges);
},

createRetainingEdgesProvider: function(nodeIndex, filter)
{
var node = new WebInspector.HeapSnapshotNode(this, nodeIndex);
return new WebInspector.HeapSnapshotEdgesProvider(this, this._parseFilter(filter), node.retainers);
},

createAddedNodesProvider: function(baseSnapshotId, className)
{
var snapshotDiff = this._snapshotDiffs[baseSnapshotId];
var diffForClass = snapshotDiff[className];
return new WebInspector.HeapSnapshotNodesProvider(this, null, diffForClass.addedIndexes);
},

createDeletedNodesProvider: function(nodeIndexes)
{
return new WebInspector.HeapSnapshotNodesProvider(this, null, nodeIndexes);
},

createNodesProviderForClass: function(className, aggregatesKey)
{
return new WebInspector.HeapSnapshotNodesProvider(this, null, this.aggregates(false, aggregatesKey)[className].idxs);
},

createNodesProviderForDominator: function(nodeIndex)
{
var node = new WebInspector.HeapSnapshotNode(this, nodeIndex);
return new WebInspector.HeapSnapshotNodesProvider(this, null, this._dominatedNodesOfNode(node));
},

updateStaticData: function()
{
return {nodeCount: this.nodeCount, rootNodeIndex: this._rootNodeIndex, totalSize: this.totalSize, uid: this.uid, nodeFlags: this._nodeFlags};
}
};


WebInspector.HeapSnapshotFilteredOrderedIterator = function(iterator, filter, unfilteredIterationOrder)
{
this._filter = filter;
this._iterator = iterator;
this._unfilteredIterationOrder = unfilteredIterationOrder;
this._iterationOrder = null;
this._position = 0;
this._currentComparator = null;
this._sortedPrefixLength = 0;
}

WebInspector.HeapSnapshotFilteredOrderedIterator.prototype = {
_createIterationOrder: function()
{
if (this._iterationOrder)
return;
if (this._unfilteredIterationOrder && !this._filter) {
this._iterationOrder = this._unfilteredIterationOrder.slice(0);
this._unfilteredIterationOrder = null;
return;
}
this._iterationOrder = [];
var iterator = this._iterator;
if (!this._unfilteredIterationOrder && !this._filter) {
for (iterator.first(); iterator.hasNext(); iterator.next())
this._iterationOrder.push(iterator.index);
} else if (!this._unfilteredIterationOrder) {
for (iterator.first(); iterator.hasNext(); iterator.next()) {
if (this._filter(iterator.item))
this._iterationOrder.push(iterator.index);
}
} else {
var order = this._unfilteredIterationOrder.constructor === Array ?
this._unfilteredIterationOrder : this._unfilteredIterationOrder.slice(0);
for (var i = 0, l = order.length; i < l; ++i) {
iterator.index = order[i];
if (this._filter(iterator.item))
this._iterationOrder.push(iterator.index);
}
this._unfilteredIterationOrder = null;
}
},

first: function()
{
this._position = 0;
},

hasNext: function()
{
return this._position < this._iterationOrder.length;
},

get isEmpty()
{
if (this._iterationOrder)
return !this._iterationOrder.length;
if (this._unfilteredIterationOrder && !this._filter)
return !this._unfilteredIterationOrder.length;
var iterator = this._iterator;
if (!this._unfilteredIterationOrder && !this._filter) {
iterator.first();
return !iterator.hasNext();
} else if (!this._unfilteredIterationOrder) {
for (iterator.first(); iterator.hasNext(); iterator.next())
if (this._filter(iterator.item))
return false;
} else {
var order = this._unfilteredIterationOrder.constructor === Array ?
this._unfilteredIterationOrder : this._unfilteredIterationOrder.slice(0);
for (var i = 0, l = order.length; i < l; ++i) {
iterator.index = order[i];
if (this._filter(iterator.item))
return false;
}
}
return true;
},

get item()
{
this._iterator.index = this._iterationOrder[this._position];
return this._iterator.item;
},

get length()
{
this._createIterationOrder();
return this._iterationOrder.length;
},

next: function()
{
++this._position;
},


serializeItemsRange: function(begin, end)
{
this._createIterationOrder();
if (begin > end)
throw new Error("Start position > end position: " + begin + " > " + end);
if (end >= this._iterationOrder.length)
end = this._iterationOrder.length;
if (this._sortedPrefixLength < end) {
this.sort(this._currentComparator, this._sortedPrefixLength, this._iterationOrder.length - 1, end - this._sortedPrefixLength);
this._sortedPrefixLength = end;
}

this._position = begin;
var startPosition = this._position;
var count = end - begin;
var result = new Array(count);
for (var i = 0 ; i < count && this.hasNext(); ++i, this.next())
result[i] = this.serializeItem(this.item);
result.length = i;
result.totalLength = this._iterationOrder.length;

result.startPosition = startPosition;
result.endPosition = this._position;
return result;
},

sortAll: function()
{
this._createIterationOrder();
if (this._sortedPrefixLength === this._iterationOrder.length)
return;
this.sort(this._currentComparator, this._sortedPrefixLength, this._iterationOrder.length - 1, this._iterationOrder.length);
this._sortedPrefixLength = this._iterationOrder.length;
},

sortAndRewind: function(comparator)
{
this._currentComparator = comparator;
this._sortedPrefixLength = 0;
this.first();
}
}

WebInspector.HeapSnapshotFilteredOrderedIterator.prototype.createComparator = function(fieldNames)
{
return {fieldName1:fieldNames[0], ascending1:fieldNames[1], fieldName2:fieldNames[2], ascending2:fieldNames[3]};
}


WebInspector.HeapSnapshotEdgesProvider = function(snapshot, filter, edgesIter)
{
this.snapshot = snapshot;
WebInspector.HeapSnapshotFilteredOrderedIterator.call(this, edgesIter, filter);
}

WebInspector.HeapSnapshotEdgesProvider.prototype = {
serializeItem: function(edge)
{
return {
name: edge.name,
propertyAccessor: edge.toString(),
node: WebInspector.HeapSnapshotNodesProvider.prototype.serializeItem(edge.node),
nodeIndex: edge.nodeIndex,
type: edge.type,
distanceToWindow: edge.node.distanceToWindow
};
},

sort: function(comparator, leftBound, rightBound, count)
{
var fieldName1 = comparator.fieldName1;
var fieldName2 = comparator.fieldName2;
var ascending1 = comparator.ascending1;
var ascending2 = comparator.ascending2;

var edgeA = this._iterator.item.clone();
var edgeB = edgeA.clone();
var nodeA = new WebInspector.HeapSnapshotNode(this.snapshot);
var nodeB = new WebInspector.HeapSnapshotNode(this.snapshot);

function compareEdgeFieldName(ascending, indexA, indexB)
{
edgeA.edgeIndex = indexA;
edgeB.edgeIndex = indexB;
if (edgeB.name === "__proto__") return -1;
if (edgeA.name === "__proto__") return 1;
var result =
edgeA.hasStringName === edgeB.hasStringName ?
(edgeA.name < edgeB.name ? -1 : (edgeA.name > edgeB.name ? 1 : 0)) :
(edgeA.hasStringName ? -1 : 1);
return ascending ? result : -result;
}

function compareNodeField(fieldName, ascending, indexA, indexB)
{
edgeA.edgeIndex = indexA;
nodeA.nodeIndex = edgeA.nodeIndex;
var valueA = nodeA[fieldName];

edgeB.edgeIndex = indexB;
nodeB.nodeIndex = edgeB.nodeIndex;
var valueB = nodeB[fieldName];

var result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
return ascending ? result : -result;
}

function compareEdgeAndNode(indexA, indexB) {
var result = compareEdgeFieldName(ascending1, indexA, indexB);
if (result === 0)
result = compareNodeField(fieldName2, ascending2, indexA, indexB);
return result;
}

function compareNodeAndEdge(indexA, indexB) {
var result = compareNodeField(fieldName1, ascending1, indexA, indexB);
if (result === 0)
result = compareEdgeFieldName(ascending2, indexA, indexB);
return result;
}

function compareNodeAndNode(indexA, indexB) {
var result = compareNodeField(fieldName1, ascending1, indexA, indexB);
if (result === 0)
result = compareNodeField(fieldName2, ascending2, indexA, indexB);
return result;
}

if (fieldName1 === "!edgeName")
this._iterationOrder.sortRange(compareEdgeAndNode, leftBound, rightBound, count);
else if (fieldName2 === "!edgeName")
this._iterationOrder.sortRange(compareNodeAndEdge, leftBound, rightBound, count);
else
this._iterationOrder.sortRange(compareNodeAndNode, leftBound, rightBound, count);
}
};

WebInspector.HeapSnapshotEdgesProvider.prototype.__proto__ = WebInspector.HeapSnapshotFilteredOrderedIterator.prototype;


WebInspector.HeapSnapshotNodesProvider = function(snapshot, filter, nodeIndexes)
{
this.snapshot = snapshot;
WebInspector.HeapSnapshotFilteredOrderedIterator.call(this, snapshot._allNodes, filter, nodeIndexes);
}

WebInspector.HeapSnapshotNodesProvider.prototype = {
nodePosition: function(snapshotObjectId)
{
this._createIterationOrder();
if (this.isEmpty)
return -1;
this.sortAll();

var node = new WebInspector.HeapSnapshotNode(this.snapshot);
for (var i = 0; i < this._iterationOrder.length; i++) {
node.nodeIndex = this._iterationOrder[i];
if (node.id === snapshotObjectId)
return i;
}
return -1;
},

serializeItem: function(node)
{
return {
id: node.id,
name: node.name,
distanceToWindow: node.distanceToWindow,
nodeIndex: node.nodeIndex,
retainedSize: node.retainedSize,
selfSize: node.selfSize,
type: node.type,
flags: node.flags
};
},

sort: function(comparator, leftBound, rightBound, count)
{
var fieldName1 = comparator.fieldName1;
var fieldName2 = comparator.fieldName2;
var ascending1 = comparator.ascending1;
var ascending2 = comparator.ascending2;

var nodeA = new WebInspector.HeapSnapshotNode(this.snapshot);
var nodeB = new WebInspector.HeapSnapshotNode(this.snapshot);

function sortByNodeField(fieldName, ascending)
{
var valueA = nodeA[fieldName];
var valueB = nodeB[fieldName];
var result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
return ascending ? result : -result;
}

function sortByComparator(indexA, indexB) {
nodeA.nodeIndex = indexA;
nodeB.nodeIndex = indexB;
var result = sortByNodeField(fieldName1, ascending1);
if (result === 0)
result = sortByNodeField(fieldName2, ascending2);
return result;
}

this._iterationOrder.sortRange(sortByComparator, leftBound, rightBound, count);
}
};

WebInspector.HeapSnapshotNodesProvider.prototype.__proto__ = WebInspector.HeapSnapshotFilteredOrderedIterator.prototype;
;



WebInspector.HeapSnapshotLoader = function()
{
this._json = "";
this._state = "find-snapshot-info";
this._snapshot = {};
}

WebInspector.HeapSnapshotLoader.prototype = {
_findBalancedCurlyBrackets: function()
{
var counter = 0;
var openingBracket = "{".charCodeAt(0), closingBracket = "}".charCodeAt(0);
for (var i = 0, l = this._json.length; i < l; ++i) {
var character = this._json.charCodeAt(i);
if (character === openingBracket)
++counter;
else if (character === closingBracket) {
if (--counter === 0)
return i + 1;
}
}
return -1;
},

finishLoading: function()
{
if (!this._json)
return null;
this._parseStringsArray();
this._json = "";
var result = new WebInspector.HeapSnapshot(this._snapshot);
this._json = "";
this._snapshot = {};
return result;
},

_parseUintArray: function()
{
var index = 0;
var char0 = "0".charCodeAt(0), char9 = "9".charCodeAt(0), closingBracket = "]".charCodeAt(0);
var length = this._json.length;
while (true) {
while (index < length) {
var code = this._json.charCodeAt(index);
if (char0 <= code && code <= char9)
break;
else if (code === closingBracket) {
this._json = this._json.slice(index + 1);
return false;
}
++index;
}
if (index === length) {
this._json = "";
return true;
}
var nextNumber = 0;
var startIndex = index;
while (index < length) {
var code = this._json.charCodeAt(index);
if (char0 > code || code > char9)
break;
nextNumber *= 10;
nextNumber += (code - char0);
++index;
}
if (index === length) {
this._json = this._json.slice(startIndex);
return true;
}
this._array.push(nextNumber);
}
},

_parseStringsArray: function()
{
var closingBracketIndex = this._json.lastIndexOf("]");
if (closingBracketIndex === -1)
throw new Error("Incomplete JSON");
this._json = this._json.slice(0, closingBracketIndex + 1);
this._snapshot.strings = JSON.parse(this._json);
},

pushJSONChunk: function(chunk)
{
this._json += chunk;
switch (this._state) {
case "find-snapshot-info": {
var snapshotToken = "\"snapshot\"";
var snapshotTokenIndex = this._json.indexOf(snapshotToken);
if (snapshotTokenIndex === -1)
throw new Error("Snapshot token not found");
this._json = this._json.slice(snapshotTokenIndex + snapshotToken.length + 1);
this._state = "parse-snapshot-info";
this.pushJSONChunk("");
break;
}
case "parse-snapshot-info": {
var closingBracketIndex = this._findBalancedCurlyBrackets();
if (closingBracketIndex === -1)
return;
this._snapshot.snapshot =  JSON.parse(this._json.slice(0, closingBracketIndex));
this._json = this._json.slice(closingBracketIndex);
this._state = "find-nodes";
this.pushJSONChunk("");
break;
}
case "find-nodes": {
var nodesToken = "\"nodes\"";
var nodesTokenIndex = this._json.indexOf(nodesToken);
if (nodesTokenIndex === -1)
return;
var bracketIndex = this._json.indexOf("[", nodesTokenIndex);
if (bracketIndex === -1)
return;
this._json = this._json.slice(bracketIndex + 1);
var node_fields_count = this._snapshot.snapshot.meta.node_fields.length;
var nodes_length = this._snapshot.snapshot.node_count * node_fields_count;
this._array = new WebInspector.Uint32Array(nodes_length);
this._state = "parse-nodes";
this.pushJSONChunk("");
break;
}
case "parse-nodes": {
if (this._parseUintArray())
return;
this._snapshot.nodes = this._array.array;
this._state = "find-edges";
this._array = null;
this.pushJSONChunk("");
break;
}
case "find-edges": {
var edgesToken = "\"edges\"";
var edgesTokenIndex = this._json.indexOf(edgesToken);
if (edgesTokenIndex === -1)
return;
var bracketIndex = this._json.indexOf("[", edgesTokenIndex);
if (bracketIndex === -1)
return;
this._json = this._json.slice(bracketIndex + 1);
var edge_fields_count = this._snapshot.snapshot.meta.edge_fields.length;
var edges_length = this._snapshot.snapshot.edge_count * edge_fields_count;
this._array = new WebInspector.Uint32Array(edges_length);
this._state = "parse-edges";
this.pushJSONChunk("");
break;
}
case "parse-edges": {
if (this._parseUintArray())
return;
this._snapshot.edges = this._array.array;
this._array = null;
this._state = "find-strings";
this.pushJSONChunk("");
break;
}
case "find-strings": {
var stringsToken = "\"strings\"";
var stringsTokenIndex = this._json.indexOf(stringsToken);
if (stringsTokenIndex === -1)
return;
var bracketIndex = this._json.indexOf("[", stringsTokenIndex);
if (bracketIndex === -1)
return;
this._json = this._json.slice(bracketIndex);
this._state = "accumulate-strings";
break;
}
case "accumulate-strings":
break;
}
}
};
;



WebInspector.HeapSnapshotWorkerDispatcher = function(globalObject, postMessage)
{
this._objects = [];
this._global = globalObject;
this._postMessage = postMessage;
}

WebInspector.HeapSnapshotWorkerDispatcher.prototype = {
_findFunction: function(name)
{
var path = name.split(".");
var result = this._global;
for (var i = 0; i < path.length; ++i)
result = result[path[i]];
return result;
},

dispatchMessage: function(event)
{
var data = event.data;
var response = {callId: data.callId};
try {
switch (data.disposition) {
case "create": {
var constructorFunction = this._findFunction(data.methodName);
this._objects[data.objectId] = new constructorFunction();
break;
}
case "dispose": {
delete this._objects[data.objectId];
break;
}
case "getter": {
var object = this._objects[data.objectId];
var result = object[data.methodName];
response.result = result;
break;
}
case "factory": {
var object = this._objects[data.objectId];
var result = object[data.methodName].apply(object, data.methodArguments);
if (result)
this._objects[data.newObjectId] = result;
response.result = !!result;
break;
}
case "method": {
var object = this._objects[data.objectId];
response.result = object[data.methodName].apply(object, data.methodArguments);
break;
}
}
} catch (e) {
response.error = e.toString();
response.errorCallStack = e.stack;
if (data.methodName)
response.errorMethodName = data.methodName;
}
this._postMessage(response);
}
};
;


String.prototype.hasSubstring = function(string, caseInsensitive)
{
if (!caseInsensitive)
return this.indexOf(string) !== -1;
return this.match(new RegExp(string.escapeForRegExp(), "i"));
}

String.prototype.findAll = function(string)
{
var matches = [];
var i = this.indexOf(string);
while (i !== -1) {
matches.push(i);
i = this.indexOf(string, i + string.length);
}
return matches;
}

String.prototype.lineEndings = function()
{
if (!this._lineEndings) {
this._lineEndings = this.findAll("\n");
this._lineEndings.push(this.length);
}
return this._lineEndings;
}

String.prototype.escapeCharacters = function(chars)
{
var foundChar = false;
for (var i = 0; i < chars.length; ++i) {
if (this.indexOf(chars.charAt(i)) !== -1) {
foundChar = true;
break;
}
}

if (!foundChar)
return this;

var result = "";
for (var i = 0; i < this.length; ++i) {
if (chars.indexOf(this.charAt(i)) !== -1)
result += "\\";
result += this.charAt(i);
}

return result;
}

String.prototype.escapeForRegExp = function()
{
return this.escapeCharacters("^[]{}()\\.$*+?|");
}

String.prototype.escapeHTML = function()
{
return this.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); 
}

String.prototype.collapseWhitespace = function()
{
return this.replace(/[\s\xA0]+/g, " ");
}

String.prototype.trimMiddle = function(maxLength)
{
if (this.length <= maxLength)
return this;
var leftHalf = maxLength >> 1;
var rightHalf = maxLength - leftHalf - 1;
return this.substr(0, leftHalf) + "\u2026" + this.substr(this.length - rightHalf, rightHalf);
}

String.prototype.trimEnd = function(maxLength)
{
if (this.length <= maxLength)
return this;
return this.substr(0, maxLength - 1) + "\u2026";
}

String.prototype.trimURL = function(baseURLDomain)
{
var result = this.replace(/^(https|http|file):\/\//i, "");
if (baseURLDomain)
result = result.replace(new RegExp("^" + baseURLDomain.escapeForRegExp(), "i"), "");
return result;
}

String.prototype.removeURLFragment = function()
{
var fragmentIndex = this.indexOf("#");
if (fragmentIndex == -1)
fragmentIndex = this.length;
return this.substring(0, fragmentIndex);
}

String.prototype.startsWith = function(substring)
{
return !this.lastIndexOf(substring, 0);
}

String.prototype.endsWith = function(substring)
{
return this.indexOf(substring, this.length - substring.length) !== -1;
}

Number.constrain = function(num, min, max)
{
if (num < min)
num = min;
else if (num > max)
num = max;
return num;
}

Date.prototype.toISO8601Compact = function()
{
function leadZero(x)
{
return x > 9 ? '' + x : '0' + x
}
return this.getFullYear() +
leadZero(this.getMonth() + 1) +
leadZero(this.getDate()) + 'T' +
leadZero(this.getHours()) +
leadZero(this.getMinutes()) +
leadZero(this.getSeconds());
}

Object.defineProperty(Array.prototype, "remove",
{

value: function(value, onlyFirst)
{
if (onlyFirst) {
var index = this.indexOf(value);
if (index !== -1)
this.splice(index, 1);
return;
}

var length = this.length;
for (var i = 0; i < length; ++i) {
if (this[i] === value)
this.splice(i, 1);
}
}
});

Object.defineProperty(Array.prototype, "keySet",
{

value: function()
{
var keys = {};
for (var i = 0; i < this.length; ++i)
keys[this[i]] = true;
return keys;
}
});

Object.defineProperty(Array.prototype, "upperBound",
{

value: function(value)
{
var first = 0;
var count = this.length;
while (count > 0) {
var step = count >> 1;
var middle = first + step;
if (value >= this[middle]) {
first = middle + 1;
count -= step + 1;
} else
count = step;
}
return first;
}
});

Object.defineProperty(Uint32Array.prototype, "sort", {
value: Array.prototype.sort
});

(function() {
var partition = {

value: function(comparator, left, right, pivotIndex)
{
function swap(array, i1, i2)
{
var temp = array[i1];
array[i1] = array[i2];
array[i2] = temp;
}

var pivotValue = this[pivotIndex];
swap(this, right, pivotIndex);
var storeIndex = left;
for (var i = left; i < right; ++i) {
if (comparator(this[i], pivotValue) < 0) {
swap(this, storeIndex, i);
++storeIndex;
}
}
swap(this, right, storeIndex);
return storeIndex;
}
};
Object.defineProperty(Array.prototype, "partition", partition);
Object.defineProperty(Uint32Array.prototype, "partition", partition);

var sortRange = {

value: function(comparator, leftBound, rightBound, k)
{
function quickSortFirstK(array, comparator, left, right, k)
{
if (right <= left)
return;
var pivotIndex = Math.floor(Math.random() * (right - left)) + left;
var pivotNewIndex = array.partition(comparator, left, right, pivotIndex);
quickSortFirstK(array, comparator, left, pivotNewIndex - 1, k);
if (pivotNewIndex < left + k - 1)
quickSortFirstK(array, comparator, pivotNewIndex + 1, right, k);
}

if (leftBound === 0 && rightBound === (this.length - 1) && k === this.length)
this.sort(comparator);
else
quickSortFirstK(this, comparator, leftBound, rightBound, k);
return this;
}
}
Object.defineProperty(Array.prototype, "sortRange", sortRange);
Object.defineProperty(Uint32Array.prototype, "sortRange", sortRange);
})();

Object.defineProperty(Array.prototype, "qselect",
{

value: function(k, comparator)
{
if (k < 0 || k >= this.length)
return;
if (!comparator)
comparator = function(a, b) { return a - b; }

var low = 0;
var high = this.length - 1;
for (;;) {
var pivotPosition = this.partition(comparator, low, high, Math.floor((high + low) / 2));
if (pivotPosition === k)
return this[k];
else if (pivotPosition > k)
high = pivotPosition - 1;
else
low = pivotPosition + 1;
}
}
});


function binarySearch(object, array, comparator)
{
var first = 0;
var last = array.length - 1;

while (first <= last) {
var mid = (first + last) >> 1;
var c = comparator(object, array[mid]);
if (c > 0)
first = mid + 1;
else if (c < 0)
last = mid - 1;
else
return mid;
}


return -(first + 1);
}

Object.defineProperty(Array.prototype, "binaryIndexOf",
{

value: function(value, comparator)
{
var result = binarySearch(value, this, comparator);
return result >= 0 ? result : -1;
}
});


function insertionIndexForObjectInListSortedByFunction(anObject, aList, aFunction)
{
var index = binarySearch(anObject, aList, aFunction);
if (index < 0)

return -index - 1;
else {

while (index > 0 && aFunction(anObject, aList[index - 1]) === 0)
index--;
return index;
}
}

Array.diff = function(left, right)
{
var o = left;
var n = right;

var ns = {};
var os = {};

for (var i = 0; i < n.length; i++) {
if (ns[n[i]] == null)
ns[n[i]] = { rows: [], o: null };
ns[n[i]].rows.push(i);
}

for (var i = 0; i < o.length; i++) {
if (os[o[i]] == null)
os[o[i]] = { rows: [], n: null };
os[o[i]].rows.push(i);
}

for (var i in ns) {
if (ns[i].rows.length == 1 && typeof(os[i]) != "undefined" && os[i].rows.length == 1) {
n[ns[i].rows[0]] = { text: n[ns[i].rows[0]], row: os[i].rows[0] };
o[os[i].rows[0]] = { text: o[os[i].rows[0]], row: ns[i].rows[0] };
}
}

for (var i = 0; i < n.length - 1; i++) {
if (n[i].text != null && n[i + 1].text == null && n[i].row + 1 < o.length && o[n[i].row + 1].text == null && n[i + 1] == o[n[i].row + 1]) {
n[i + 1] = { text: n[i + 1], row: n[i].row + 1 };
o[n[i].row + 1] = { text: o[n[i].row + 1], row: i + 1 };
}
}

for (var i = n.length - 1; i > 0; i--) {
if (n[i].text != null && n[i - 1].text == null && n[i].row > 0 && o[n[i].row - 1].text == null &&
n[i - 1] == o[n[i].row - 1]) {
n[i - 1] = { text: n[i - 1], row: n[i].row - 1 };
o[n[i].row - 1] = { text: o[n[i].row - 1], row: i - 1 };
}
}

return { left: o, right: n };
}

Array.convert = function(list)
{

return Array.prototype.slice.call(list);
}


String.sprintf = function(format, var_arg)
{
return String.vsprintf(format, Array.prototype.slice.call(arguments, 1));
}

String.tokenizeFormatString = function(format, formatters)
{
var tokens = [];
var substitutionIndex = 0;

function addStringToken(str)
{
tokens.push({ type: "string", value: str });
}

function addSpecifierToken(specifier, precision, substitutionIndex)
{
tokens.push({ type: "specifier", specifier: specifier, precision: precision, substitutionIndex: substitutionIndex });
}

function isDigit(c)
{
return !!/[0-9]/.exec(c);
}

var index = 0;
for (var precentIndex = format.indexOf("%", index); precentIndex !== -1; precentIndex = format.indexOf("%", index)) {
addStringToken(format.substring(index, precentIndex));
index = precentIndex + 1;

if (isDigit(format[index])) {

var number = parseInt(format.substring(index), 10);
while (isDigit(format[index]))
++index;



if (number > 0 && format[index] === "$") {
substitutionIndex = (number - 1);
++index;
}
}

var precision = -1;
if (format[index] === ".") {


++index;
precision = parseInt(format.substring(index), 10);
if (isNaN(precision))
precision = 0;

while (isDigit(format[index]))
++index;
}

if (!(format[index] in formatters)) {
addStringToken(format.substring(precentIndex, index + 1));
++index;
continue;
}

addSpecifierToken(format[index], precision, substitutionIndex);

++substitutionIndex;
++index;
}

addStringToken(format.substring(index));

return tokens;
}

String.standardFormatters = {
d: function(substitution)
{
return !isNaN(substitution) ? substitution : 0;
},

f: function(substitution, token)
{
if (substitution && token.precision > -1)
substitution = substitution.toFixed(token.precision);
return !isNaN(substitution) ? substitution : (token.precision > -1 ? Number(0).toFixed(token.precision) : 0);
},

s: function(substitution)
{
return substitution;
}
}

String.vsprintf = function(format, substitutions)
{
return String.format(format, substitutions, String.standardFormatters, "", function(a, b) { return a + b; }).formattedResult;
}

String.format = function(format, substitutions, formatters, initialValue, append)
{
if (!format || !substitutions || !substitutions.length)
return { formattedResult: append(initialValue, format), unusedSubstitutions: substitutions };

function prettyFunctionName()
{
return "String.format(\"" + format + "\", \"" + substitutions.join("\", \"") + "\")";
}

function warn(msg)
{
console.warn(prettyFunctionName() + ": " + msg);
}

function error(msg)
{
console.error(prettyFunctionName() + ": " + msg);
}

var result = initialValue;
var tokens = String.tokenizeFormatString(format, formatters);
var usedSubstitutionIndexes = {};

for (var i = 0; i < tokens.length; ++i) {
var token = tokens[i];

if (token.type === "string") {
result = append(result, token.value);
continue;
}

if (token.type !== "specifier") {
error("Unknown token type \"" + token.type + "\" found.");
continue;
}

if (token.substitutionIndex >= substitutions.length) {


error("not enough substitution arguments. Had " + substitutions.length + " but needed " + (token.substitutionIndex + 1) + ", so substitution was skipped.");
result = append(result, "%" + (token.precision > -1 ? token.precision : "") + token.specifier);
continue;
}

usedSubstitutionIndexes[token.substitutionIndex] = true;

if (!(token.specifier in formatters)) {

warn("unsupported format character \u201C" + token.specifier + "\u201D. Treating as a string.");
result = append(result, substitutions[token.substitutionIndex]);
continue;
}

result = append(result, formatters[token.specifier](substitutions[token.substitutionIndex], token));
}

var unusedSubstitutions = [];
for (var i = 0; i < substitutions.length; ++i) {
if (i in usedSubstitutionIndexes)
continue;
unusedSubstitutions.push(substitutions[i]);
}

return { formattedResult: result, unusedSubstitutions: unusedSubstitutions };
}


function createSearchRegex(query, caseSensitive, isRegex)
{
var regexFlags = caseSensitive ? "g" : "gi";
var regexObject;

if (isRegex) {
try {
regexObject = new RegExp(query, regexFlags);
} catch (e) {

}
}

if (!regexObject)
regexObject = createPlainTextSearchRegex(query, regexFlags);

return regexObject;
}


function createPlainTextSearchRegex(query, flags)
{

var regexSpecialCharacters = "[](){}+-*.,?\\^$|";
var regex = "";
for (var i = 0; i < query.length; ++i) {
var c = query.charAt(i);
if (regexSpecialCharacters.indexOf(c) != -1)
regex += "\\";
regex += c;
}
return new RegExp(regex, flags || "");
}


function countRegexMatches(regex, content)
{
var text = content;
var result = 0;
var match;
while (text && (match = regex.exec(text))) {
if (match[0].length > 0)
++result;
text = text.substring(match.index + 1);
}
return result;
}


function numberToStringWithSpacesPadding(value, symbolsCount)
{
var numberString = value.toString();
var paddingLength = Math.max(0, symbolsCount - numberString.length);
var paddingString = Array(paddingLength + 1).join("\u00a0");
return paddingString + numberString;
}


function TextDiff()
{
this.added = [];
this.removed = [];
this.changed = [];
} 


TextDiff.compute = function(baseContent, newContent)
{
var oldLines = baseContent.split(/\r?\n/);
var newLines = newContent.split(/\r?\n/);

var diff = Array.diff(oldLines, newLines);

var diffData = new TextDiff();

var offset = 0;
var right = diff.right;
for (var i = 0; i < right.length; ++i) {
if (typeof right[i] === "string") {
if (right.length > i + 1 && right[i + 1].row === i + 1 - offset)
diffData.changed.push(i);
else {
diffData.added.push(i);
offset++;
}
} else
offset = i - right[i].row;
}
return diffData;
}


var Map = function()
{
this._map = {};
}

Map._lastObjectIdentifier = 0;

Map.prototype = {

put: function(key, value)
{
var objectIdentifier = key.__identifier;
if (!objectIdentifier) {
objectIdentifier = ++Map._lastObjectIdentifier;
key.__identifier = objectIdentifier;
}
this._map[objectIdentifier] = value;
},


remove: function(key)
{
var result = this._map[key.__identifier];
delete this._map[key.__identifier];
return result;
},

values: function()
{
var result = [];
for (var objectIdentifier in this._map)
result.push(this._map[objectIdentifier]);
return result;
},


get: function(key)
{
return this._map[key.__identifier];
},

clear: function()
{
this._map = {};
}
}
;

function postMessageWrapper(message)
{
postMessage(message);
}

var dispatcher = new WebInspector.HeapSnapshotWorkerDispatcher(this, postMessageWrapper);
addEventListener("message", dispatcher.dispatchMessage.bind(dispatcher), false);
