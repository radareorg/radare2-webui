/*********************
 * browser detection *
 *********************/

var ie=document.all;
var nn6=document.getElementById&&!document.all;

/*********************
 * DOT format parser *
 *********************/

/**
 * Parse basic GraphViz DOT format and return nodes and edges
 * @param {string} dotString - The DOT format string
 * @returns {object} Object with nodes and edges arrays
 */
function parseDotFormat(dotString) {
    var nodes = [];
    var edges = [];

    // Remove comments (//, /* */, and #) while respecting quoted strings
    dotString = (function stripComments(input) {
        var out = '';
        var inString = false;
        var escapeNext = false;
        for (var i = 0; i < input.length; i++) {
            var c = input[i];
            var next = i + 1 < input.length ? input[i + 1] : '';

            if (escapeNext) {
                out += c;
                escapeNext = false;
                continue;
            }

            if (c === '\\') {
                // keep escapes inside strings
                if (inString) {
                    escapeNext = true;
                }
                out += c;
                continue;
            }

            if (c === '"') {
                inString = !inString;
                out += c;
                continue;
            }

            if (!inString) {
                // C++ style // comment
                if (c === '/' && next === '/') {
                    // skip until end of line
                    while (i < input.length && input[i] !== '\n') i++;
                    out += '\n';
                    continue;
                }
                // C style /* */ comment
                if (c === '/' && next === '*') {
                    i += 2; // skip /*
                    while (i < input.length && !(input[i] === '*' && i + 1 < input.length && input[i + 1] === '/')) i++;
                    i++; // skip closing '/'
                    continue;
                }
                // Graphviz # line comment (but not in strings)
                if (c === '#') {
                    while (i < input.length && input[i] !== '\n') i++;
                    out += '\n';
                    continue;
                }
            }

            out += c;
        }
        return out;
    })(dotString);

    // Extract content between digraph braces
    var graphMatch = dotString.match(/digraph\s+(?:"[^"]*"|\w+)?\s*\{([\s\S]*)\}/);
    if (!graphMatch) {
        console.error('Invalid DOT format: missing digraph declaration');
        return { nodes: nodes, edges: edges };
    }

    var content = graphMatch[1];

    // Use a more robust parser that handles quoted strings properly
    var statements = parseDotStatements(content);

    for (var i = 0; i < statements.length; i++) {
        var statement = statements[i].trim();
        if (!statement) continue;

        // Skip graph, node, and edge attribute statements
        if (statement.match(/^(graph|node|edge)\s*\[/)) continue;

        // Check if it's an edge (contains ->)
        if (statement.indexOf('->') !== -1) {
            // Parse edge: "node1" -> "node2" [attributes] or node1 -> node2 [attributes]
            var edgeMatch = statement.match(/^\s*"([^"]+)"\s*->\s*"([^"]+)"|^(\w+)\s*->\s*(\w+)/);
            if (edgeMatch) {
                var source = edgeMatch[1] || edgeMatch[3];
                var target = edgeMatch[2] || edgeMatch[4];
                edges.push({
                    source: source,
                    target: target
                });

                // Add nodes if not already present
                if (!nodes.find(n => n.id === source)) {
                    nodes.push({ id: source, label: source });
                }
                if (!nodes.find(n => n.id === target)) {
                    nodes.push({ id: target, label: target });
                }
            }
        } else if (statement.indexOf('[') !== -1) {
            // Parse node with attributes: "node_id" [label="content", ...]
            var nodeMatch = statement.match(/^\s*"([^"]+)"\s*\[([^\]]+)\]|^(\w+)\s*\[([^\]]+)\]/);
            if (nodeMatch) {
                var nodeId = nodeMatch[1] || nodeMatch[3];
                var attributes = nodeMatch[2] || nodeMatch[4];

                // Extract label from attributes - handle multi-line labels properly
                var labelMatch = attributes.match(/label\s*=\s*"((?:[^"\\]|\\.|\\")*)"/);
                var label = labelMatch ? labelMatch[1] : nodeId;

                // Clean up the label (handle various escape sequences)
                label = label.replace(/\\l/g, '\n');  // Left-aligned line break
                label = label.replace(/\\n/g, '\n');  // Regular newline
                label = label.replace(/\\r/g, '\r');  // Carriage return
                label = label.replace(/\\t/g, '\t');  // Tab
                label = label.replace(/\\"/g, '"');   // Escaped quotes
                label = label.replace(/\\\\/g, '\\'); // Escaped backslashes

                var existingNode = nodes.find(n => n.id === nodeId);
                if (!existingNode) {
                    nodes.push({ id: nodeId, label: label });
                } else {
                    existingNode.label = label;
                }
            }
        }
    }

    // Fallback parser if nothing was detected (be permissive)
    if (nodes.length === 0 && edges.length === 0) {
        try {
            // Nodes
            var nodeRegex = /"([^"]+)"\s*\[([^\]]*)\]/g;
            var m;
            while ((m = nodeRegex.exec(content)) !== null) {
                var nid = m[1];
                var attrs = m[2] || '';
                var lm = attrs.match(/label\s*=\s*"((?:[^"\\]|\\.)*)"/);
                var lbl = lm ? lm[1] : nid;
                lbl = lbl.replace(/\\l/g, '\n').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                if (!nodes.find(function(n){return n.id===nid;})) nodes.push({id:nid, label: lbl});
            }
            // Edges
            var edgeRegex = /"([^"]+)"\s*->\s*"([^"]+)"/g;
            var em;
            while ((em = edgeRegex.exec(content)) !== null) {
                edges.push({ source: em[1], target: em[2] });
                if (!nodes.find(function(n){return n.id===em[1];})) nodes.push({id: em[1], label: em[1]});
                if (!nodes.find(function(n){return n.id===em[2];})) nodes.push({id: em[2], label: em[2]});
            }
        } catch(e) {
            // ignore
        }
    }

    return { nodes: nodes, edges: edges };
}

/**
 * Parse DOT statements, properly handling quoted strings and semicolons
 * @param {string} content - The content inside the digraph braces
 * @returns {string[]} Array of statements
 */
function parseDotStatements(content) {
    var statements = [];
    var current = '';
    var inString = false;
    var escapeNext = false;
    var bracketDepth = 0; // Tracks [...] attribute lists

    for (var i = 0; i < content.length; i++) {
        var char = content[i];

        if (escapeNext) {
            current += char;
            escapeNext = false;
            continue;
        }

        if (char === '\\') {
            escapeNext = true;
            current += char;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            current += char;
            continue;
        }

        // Track attribute list brackets when not inside strings
        if (!inString) {
            if (char === '[') {
                bracketDepth++;
            } else if (char === ']') {
                bracketDepth = Math.max(0, bracketDepth - 1);
                // Include the closing bracket in the current token
                current += char;
                // If we are back to top-level after an attribute list, this can terminate a statement
                if (bracketDepth === 0) {
                    if (current.trim()) {
                        statements.push(current.trim());
                    }
                    current = '';
                    continue;
                }
                // Already appended ']' and handled termination if needed
                continue;
            }
        }

        // Semicolon also terminates a statement when not in a string
        if (char === ';' && !inString && bracketDepth === 0) {
            if (current.trim()) {
                statements.push(current.trim());
            }
            current = '';
            continue;
        }

        current += char;
    }

    // Add the last statement if any
    if (current.trim()) {
        statements.push(current.trim());
    }

    return statements;
}

/**
 * Create HTML elements for nodes and edges from parsed DOT data
 * @param {object} graphData - Object with nodes and edges arrays
 * @param {HTMLElement} container - Container element to append to
 */
function createGraphFromDot(graphData, container) {
    var nodes = graphData.nodes;
    var edges = graphData.edges;

    // Clear existing content
    container.innerHTML = '';

    // Create nodes (pre-position to ensure visibility even before layout)
    var seedX = 20, seedY = 20, seedRowH = 0, seedGapX = 30, seedGapY = 40;
    var seedMaxW = container.clientWidth || 800;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var nodeDiv = document.createElement('div');
        nodeDiv.className = 'block draggable';
        nodeDiv.id = node.id;

        // Use the parsed label from DOT format
        var blockContent = node.label || node.id;

        // Parse the label to extract title and body for IDA Pro style
        var title = node.id;
        var body = blockContent;

        // If the label contains multiple lines, extract function name as title
        var lines = blockContent.split('\n');
        if (lines.length > 1) {
            // Look for function signature in first line
            var firstLine = lines[0].trim();
            if (firstLine.includes('sym.func.') || firstLine.includes('(')) {
                title = firstLine;
                body = lines.slice(1).join('\n').trim();
            } else {
                // Use address as title, rest as body
                title = node.id;
                body = blockContent;
            }
        }

        // Create IDA Pro style node with title and body
        nodeDiv.innerHTML = '<div class="node-title">' + title + '</div>' +
                           '<div class="node-body"><pre>' + body + '</pre></div>';
        // ensure absolute positioning so it shows before layout
        nodeDiv.style.position = 'absolute';
        nodeDiv.style.left = seedX + 'px';
        nodeDiv.style.top = seedY + 'px';

        container.appendChild(nodeDiv);

        // naive pre-layout to avoid blank screen
        var w = nodeDiv.offsetWidth || 250;
        var h = nodeDiv.offsetHeight || 80;
        seedRowH = Math.max(seedRowH, h);
        seedX += (w + seedGapX);
        if (seedX > seedMaxW - 200) { // wrap row
            seedX = 20;
            seedY += seedRowH + seedGapY;
            seedRowH = 0;
        }
    }

    // Create edges
    for (var j = 0; j < edges.length; j++) {
        var edge = edges[j];
        var edgeDiv = document.createElement('div');
        edgeDiv.className = 'connector ' + edge.source + ' ' + edge.target;
        edgeDiv.id = 'edge_' + j;
        container.appendChild(edgeDiv);
    }
}

/************************
 * Control Flow Graph Layout *
 ************************/

/**
 * Detect cycles in the graph using DFS
 * @param {string} node - Current node
 * @param {Object} adjList - Adjacency list
 * @param {Object} visited - Visited nodes
 * @param {Object} recStack - Recursion stack
 * @returns {boolean} True if cycle detected
 */
function hasCycleDFS(node, adjList, visited, recStack) {
    visited[node] = true;
    recStack[node] = true;

    var neighbors = adjList[node] || [];
    for (var i = 0; i < neighbors.length; i++) {
        var neighbor = neighbors[i];
        if (!visited[neighbor] && hasCycleDFS(neighbor, adjList, visited, recStack)) {
            return true;
        } else if (recStack[neighbor]) {
            return true;
        }
    }

    recStack[node] = false;
    return false;
}

/**
 * Check if graph has cycles
 * @param {Object} adjList - Adjacency list
 * @returns {boolean} True if cycles exist
 */
function hasCycles(adjList) {
    var visited = {};
    var recStack = {};

    for (var node in adjList) {
        if (!visited[node]) {
            if (hasCycleDFS(node, adjList, visited, recStack)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Layout nodes in a control-flow-graph style using topological sorting
 * @param {Array} blocks - Array of Block objects
 * @param {Array} connectors - Array of Connector objects
 * @param {Object} canvas - Canvas object for dimension calculations
 */
function layoutControlFlowGraph(blocks, connectors, canvas) {
    if (!blocks || blocks.length === 0) return;

    // Build adjacency (outgoing) and incoming lists and indegree map
    var adjList = {};
    var inAdj = {};
    var indegree = {};
    var nodeMap = {};

    for (var i = 0; i < blocks.length; i++) {
        var blockId = blocks[i].id;
        adjList[blockId] = [];
        inAdj[blockId] = [];
        indegree[blockId] = 0;
        nodeMap[blockId] = blocks[i];
    }

    for (var j = 0; j < connectors.length; j++) {
        var connector = connectors[j];
        if (connector.source && connector.destination) {
            var sourceId = connector.source.id;
            var destId = connector.destination.id;
            adjList[sourceId].push(destId);
            inAdj[destId].push(sourceId);
            indegree[destId] = (indegree[destId] || 0) + 1;
        }
    }

    // Kahn topological layering
    var queue = [];
    var levels = {};
    var currentLevel = 0;
    var processed = 0;

    for (var nodeId in indegree) {
        if (indegree[nodeId] === 0) {
            queue.push(nodeId);
            levels[nodeId] = 0;
        }
    }

    while (queue.length > 0) {
        var levelSize = queue.length;
        for (var k = 0; k < levelSize; k++) {
            var currentNode = queue.shift();
            processed++;
            var neighbors = adjList[currentNode] || [];
            for (var m = 0; m < neighbors.length; m++) {
                var neighbor = neighbors[m];
                indegree[neighbor]--;
                if (indegree[neighbor] === 0) {
                    queue.push(neighbor);
                    levels[neighbor] = currentLevel + 1;
                }
            }
        }
        currentLevel++;
    }

    // Handle cycles: place remaining nodes at the deepest current level
    if (processed < Object.keys(nodeMap).length) {
        for (var id in nodeMap) {
            if (!(id in levels)) levels[id] = currentLevel; // push cyclic nodes down
        }
    }

    // Bucket nodes by level and compute level sizes
    var levelNodes = {};
    var maxLevel = 0;
    for (var id2 in levels) {
        var lvl = levels[id2];
        if (!levelNodes[lvl]) levelNodes[lvl] = [];
        levelNodes[lvl].push(id2);
        if (lvl > maxLevel) maxLevel = lvl;
    }

    // Barycentric ordering to reduce crossings
    var xPos = {}; // store x of nodes once placed for ordering of subsequent levels
    var baseGapX = 60;
    var gapY = 80;

    // Compute level heights to stack with spacing
    var levelHeights = [];
    for (var l = 0; l <= maxLevel; l++) {
        var nodesAt = levelNodes[l] || [];
        var h = 0;
        for (var t = 0; t < nodesAt.length; t++) {
            var b = nodeMap[nodesAt[t]];
            if (b) h = Math.max(h, b.height());
        }
        levelHeights[l] = h || 50;
    }

    // Canvas dimensions
    var canvasWidth = canvas ? (canvas.width || canvas.htmlElement.offsetWidth) : 800;
    var startY = 20; // top margin
    var yCursor = startY;

    for (var l2 = 0; l2 <= maxLevel; l2++) {
        var nodesAtLevel = levelNodes[l2] || [];
        if (nodesAtLevel.length === 0) {
            yCursor += levelHeights[l2] + gapY;
            continue;
        }

        // Sort by barycenter of predecessors (or keep stable for level 0)
        if (l2 > 0) {
            nodesAtLevel.sort(function(a, b) {
                function barycenter(id) {
                    var preds = inAdj[id] || [];
                    if (preds.length === 0) return 0;
                    var sum = 0, count = 0;
                    for (var p = 0; p < preds.length; p++) {
                        var px = xPos[preds[p]];
                        if (typeof px === 'number') { sum += px; count++; }
                    }
                    return count ? (sum / count) : 0;
                }
                return barycenter(a) - barycenter(b);
            });
        }

        // Compute total width of this level using actual block widths
        var totalWidth = 0;
        var widths = [];
        for (var n = 0; n < nodesAtLevel.length; n++) {
            var bl = nodeMap[nodesAtLevel[n]];
            var w = bl ? bl.width() : 200;
            widths.push(w);
            totalWidth += w;
        }
        var totalGaps = baseGapX * (nodesAtLevel.length - 1);
        var levelTotal = totalWidth + totalGaps;
        var startX = Math.max(20, (canvasWidth - levelTotal) / 2);

        // Place nodes in order, store center x for barycenter of next level
        var xCursor = startX;
        for (var idx = 0; idx < nodesAtLevel.length; idx++) {
            var nodeId = nodesAtLevel[idx];
            var block = nodeMap[nodeId];
            var w = widths[idx];
            if (block) {
                var x = xCursor;
                var y = yCursor;
                block.move(x, y);
                xPos[nodeId] = x + w / 2;
            }
            xCursor += w + baseGapX;
        }

        yCursor += levelHeights[l2] + gapY;
    }
}

/****************************************************
 * This class is a scanner for the visitor pattern. *
 ****************************************************/
 
/**
 * Constructor, parameters are:
 * visitor: the visitor implementation, it must be a class with a visit(element) method.
 * scanElementsOnly: a flag telling whether to scan html elements only or all html nodes.
 */
function DocumentScanner(visitor, scanElementsOnly) {
	this.visitor = visitor;
	this.scanElementsOnly = scanElementsOnly;

	/**
	 * Scans the element
	 */
	this.scan = function(element) {
		if (this.visitor.visit(element)) {
			// visit child elements
			var children = element.childNodes;
			for(var i = 0; i < children.length; i++) {
				if(!this.scanElementsOnly || children[i].nodeType == 1)
					this.scan(children[i]);
			}
		}		
	}	
}

/*****************
 * drag and drop *
 *****************/
 
var isdrag=false;					// this flag indicates that the mouse movement is actually a drag.
var mouseStartX, mouseStartY;		// mouse position when drag starts
var elementStartX, elementStartY;	// element position when drag starts
var lastRepaintTime = 0;			// timestamp of last connector repaint during drag
var repaintThrottleMs = 16;			// throttle repaints to ~60fps (16ms)

/**
 * the html element being dragged.
 */
var elementToMove;

/**
 * an array containing the blocks being dragged. This is used to notify them of move.
 */
var blocksToMove;

/**
 * flag indicating if we're panning the entire canvas
 */
var canvasPanning = false;

/**
 * array storing initial positions of blocks for panning
 */
var initialBlockPositions = [];

/**
 * flag indicating if we're scrolling the canvas
 */
var canvasScrolling = false;

/**
 * initial scroll positions for scrolling
 */
var initialScrollLeft = 0;
var initialScrollTop = 0;

/**
 * zoom level and related variables
 */
var currentZoom = 1.0;
var minZoom = 0.1;
var maxZoom = 3.0;
var zoomStep = 0.1;

/**
 * this variable stores the original z-index of the object being dragged in order
 * to restore it upon drop.
 */ 
var originalZIndex;

/**
 * an array containing bounds to be respected while dragging elements,
 * these bounds are left, top, left + width, top + height of the parent element.
 */
var bounds = new Array(4);

/**
 * this visitor is used to find blocks nested in the element being moved.
 */
function BlocksToMoveVisitor() {
	this.visit = function(element) {
		if (isBlock(element)) {
			blocksToMove.push(findBlock(element.id));
			return false;
		}
		return true;
	}
}

var blocksToMoveScanner = new DocumentScanner(new BlocksToMoveVisitor(), true);

function movemouse(e) {
	if (isdrag) {
		var currentMouseX = nn6 ? e.clientX : event.clientX;
		var currentMouseY = nn6 ? e.clientY : event.clientY;
		var newElementX = elementStartX + currentMouseX - mouseStartX;
		var newElementY = elementStartY + currentMouseY - mouseStartY;

		// check bounds
		// note: the "-1" and "+1" is to avoid borders overlap
		if(newElementX < bounds[0])
			newElementX = bounds[0] + 1;
		if(newElementX + elementToMove.offsetWidth > bounds[2])
			newElementX = bounds[2] - elementToMove.offsetWidth - 1;
		if(newElementY < bounds[1])
			newElementY = bounds[1] + 1;
		if(newElementY + elementToMove.offsetHeight > bounds[3])
			newElementY = bounds[3] - elementToMove.offsetHeight - 1;
		
		// move element
		elementToMove.style.left = newElementX + 'px';
		elementToMove.style.top  = newElementY + 'px';

//		elementToMove.style.left = newElementX / elementToMove.parentNode.offsetWidth * 100 + '%';
//		elementToMove.style.top  = newElementY / elementToMove.parentNode.offsetHeight * 100 + '%';

		elementToMove.style.right = null;
		elementToMove.style.bottom = null;

        // Repaint connectors for affected blocks
        for (var i = 0; i < blocksToMove.length; i++) {
            if (blocksToMove[i])
                blocksToMove[i].onMove();
        }
        return false;
    }
}

/**
 * finds the innermost draggable element starting from the one that generated the event "e"
 * (i.e.: the html element under mouse pointer), then setup the document's onmousemove function to
 * move the element around.
 */
function startDrag(e) {
	var eventSource = nn6 ? e.target : event.srcElement;
	if (eventSource.tagName == 'HTML')
		return;

	while (eventSource != document.body && !hasClass(eventSource, "draggable"))
	{
		eventSource = nn6 ? eventSource.parentNode : eventSource.parentElement;
	}

	// if a draggable element was found, calculate its actual position
	if (hasClass(eventSource, "draggable")) {
		isdrag = true;
		elementToMove = eventSource;

		// set absolute positioning on the element
		elementToMove.style.position = "absolute";

		// calculate start point
		elementStartX = elementToMove.offsetLeft;
		elementStartY = elementToMove.offsetTop;

		// calculate mouse start point
		mouseStartX = nn6 ? e.clientX : event.clientX;
		mouseStartY = nn6 ? e.clientY : event.clientY;

		// calculate bounds as left, top, width, height of the parent element
		if(getStyle(elementToMove.parentNode, "position") == 'absolute') {
			bounds[0] = bounds[1] = 0;
		} else {
			bounds[0] = calculateOffsetLeft(elementToMove.parentNode);
			bounds[1] = calculateOffsetTop(elementToMove.parentNode);
		}
		bounds[2] = bounds[0] + elementToMove.parentNode.offsetWidth;
		bounds[3] = bounds[1] + elementToMove.parentNode.offsetHeight;

		// either find the block related to the dragging element to call its onMove method
		blocksToMove = new Array();

		blocksToMoveScanner.scan(eventSource);
		document.onmousemove = movemouse;

		originalZIndex = getStyle(elementToMove, "z-index");
		elementToMove.style.zIndex = "3";

		return false;
	} else {
		// Check if we're clicking on the canvas background for panning
		var canvasElement = findCanvasElement(eventSource);
		if (canvasElement) {
			// Start canvas scrolling
			isdrag = true;
			elementToMove = null; // No specific element to move
			canvasScrolling = true;

			// Store initial mouse position and scroll position for scrolling
			mouseStartX = nn6 ? e.clientX : event.clientX;
			mouseStartY = nn6 ? e.clientY : event.clientY;
			initialScrollLeft = canvasElement.scrollLeft;
			initialScrollTop = canvasElement.scrollTop;

			document.onmousemove = scrollCanvas;
			return false;
		}
	}
}

/**
 * Scroll the canvas by adjusting scroll position
 */
function scrollCanvas(e) {
    if (canvasScrolling) {
        var currentMouseX = nn6 ? e.clientX : event.clientX;
        var currentMouseY = nn6 ? e.clientY : event.clientY;

        var deltaX = currentMouseX - mouseStartX;
        var deltaY = currentMouseY - mouseStartY;

        // Find the canvas element and update scroll position
        if (canvases && canvases.length > 0) {
            var canvasElement = canvases[0].htmlElement;
            var scrollSpeed = 1.5; // Adjust scroll sensitivity
            canvasElement.scrollLeft = initialScrollLeft - deltaX * scrollSpeed;
            canvasElement.scrollTop = initialScrollTop - deltaY * scrollSpeed;
        }

        return false;
    }
}

/**
 * Check if a line segment intersects with any node
 */
function lineIntersectsNodes(x1, y1, x2, y2, excludeNode) {
	if (!canvases || canvases.length === 0) return false;

	var canvas = canvases[0];
	for (var i = 0; i < canvas.blocks.length; i++) {
		var block = canvas.blocks[i];
		if (block === excludeNode) continue;

		var blockLeft = block.left();
		var blockTop = block.top();
		var blockRight = blockLeft + block.width();
		var blockBottom = blockTop + block.height();

		// Check if line intersects with block bounding box
		if (lineIntersectsRect(x1, y1, x2, y2, blockLeft, blockTop, blockRight, blockBottom)) {
			return true;
		}
	}
	return false;
}

/**
 * Check if a line intersects with a rectangle
 */
function lineIntersectsRect(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectBottom) {
	// Check if either endpoint is inside the rectangle
	if (x1 >= rectLeft && x1 <= rectRight && y1 >= rectTop && y1 <= rectBottom) return true;
	if (x2 >= rectLeft && x2 <= rectRight && y2 >= rectTop && y2 <= rectBottom) return true;

	// Check line intersections with rectangle edges
	return lineIntersectsLine(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectTop) || // top
		   lineIntersectsLine(x1, y1, x2, y2, rectRight, rectTop, rectRight, rectBottom) || // right
		   lineIntersectsLine(x1, y1, x2, y2, rectRight, rectBottom, rectLeft, rectBottom) || // bottom
		   lineIntersectsLine(x1, y1, x2, y2, rectLeft, rectBottom, rectLeft, rectTop); // left
}

/**
 * Find a clear path between two nodes that avoids intersecting other nodes
 */
function findClearPath(sourceBlock, destBlock, sourceLeft, sourceTop, sourceWidth, sourceHeight,
                      destLeft, destTop, destWidth, destHeight, goingRight) {
	var sourceCenterY = sourceTop + sourceHeight / 2;
	var destCenterY = destTop + destHeight / 2;
	var baseVLength = destCenterY - sourceCenterY;

	// Start with direct path
	var hLength = goingRight ? (destLeft - (sourceLeft + sourceWidth)) : (destLeft + destWidth - sourceLeft);
	var startHLength = Math.floor(Math.abs(hLength) / 2);
	var endHLength = Math.floor(Math.abs(hLength) / 2);

	// Try direct path first
	var directPath = {
		vLength: baseVLength,
		startHLength: goingRight ? startHLength : -startHLength,
		endHLength: goingRight ? endHLength : -endHLength
	};

	if (!pathIntersectsNodes(sourceBlock, destBlock, directPath, sourceLeft, sourceTop, sourceWidth, sourceHeight,
	                        destLeft, destTop, destWidth, destHeight, goingRight)) {
		return directPath;
	}

	// If direct path intersects, try with increasing vertical offsets
	var maxOffset = 200; // Maximum vertical offset to try
	var step = 20; // Step size for offset

	for (var offset = step; offset <= maxOffset; offset += step) {
		// Try positive offset
		var pathUp = {
			vLength: baseVLength + offset,
			startHLength: goingRight ? startHLength : -startHLength,
			endHLength: goingRight ? endHLength : -endHLength
		};

		if (!pathIntersectsNodes(sourceBlock, destBlock, pathUp, sourceLeft, sourceTop, sourceWidth, sourceHeight,
		                        destLeft, destTop, destWidth, destHeight, goingRight)) {
			return pathUp;
		}

		// Try negative offset
		var pathDown = {
			vLength: baseVLength - offset,
			startHLength: goingRight ? startHLength : -startHLength,
			endHLength: goingRight ? endHLength : -endHLength
		};

		if (!pathIntersectsNodes(sourceBlock, destBlock, pathDown, sourceLeft, sourceTop, sourceWidth, sourceHeight,
		                        destLeft, destTop, destWidth, destHeight, goingRight)) {
			return pathDown;
		}
	}

	// If no clear path found, return the direct path as fallback
	return directPath;
}

/**
 * Check if a proposed path intersects with any nodes
 */
function pathIntersectsNodes(sourceBlock, destBlock, path, sourceLeft, sourceTop, sourceWidth, sourceHeight,
                            destLeft, destTop, destWidth, destHeight, goingRight) {
	var sourceX = goingRight ? sourceLeft + sourceWidth : sourceLeft;
	var sourceY = sourceTop + sourceHeight / 2;

	var cornerX = sourceX + path.startHLength * (goingRight ? 1 : -1);
	var cornerY = sourceY + path.vLength;

	var destX = goingRight ? destLeft : destLeft + destWidth;
	var destY = destTop + destHeight / 2;

	// Check three segments of the path
	// 1. Horizontal from source to corner
	if (lineIntersectsNodes(sourceX, sourceY, cornerX, sourceY, sourceBlock)) return true;

	// 2. Vertical from corner to destination level
	if (lineIntersectsNodes(cornerX, sourceY, cornerX, cornerY, sourceBlock)) return true;

	// 3. Horizontal from corner to destination
	if (lineIntersectsNodes(cornerX, cornerY, destX, destY, destBlock)) return true;

	return false;
}

/**
 * Find a clear path between two nodes for vertical routing that avoids intersecting other nodes
 */
function findClearPathVertical(sourceBlock, destBlock, sourceLeft, sourceTop, sourceWidth, sourceHeight,
                              destLeft, destTop, destWidth, destHeight, goingDown) {
	var sourceCenterX = sourceLeft + sourceWidth / 2;
	var destCenterX = destLeft + destWidth / 2;
	var baseHLength = destCenterX - sourceCenterX;

	// Start with direct path
	var vLength = goingDown ? (destTop - (sourceTop + sourceHeight)) : (destTop + destHeight - sourceTop);
	var startVLength = Math.floor(Math.abs(vLength) / 2);
	var endVLength = Math.floor(Math.abs(vLength) / 2);

	// Try direct path first
	var directPath = {
		hLength: baseHLength,
		startVLength: goingDown ? startVLength : -startVLength,
		endVLength: goingDown ? endVLength : -endVLength
	};

	if (!pathIntersectsNodesVertical(sourceBlock, destBlock, directPath, sourceLeft, sourceTop, sourceWidth, sourceHeight,
	                                destLeft, destTop, destWidth, destHeight, goingDown)) {
		return directPath;
	}

	// If direct path intersects, try with increasing horizontal offsets
	var maxOffset = 200; // Maximum horizontal offset to try
	var step = 20; // Step size for offset

	for (var offset = step; offset <= maxOffset; offset += step) {
		// Try positive offset
		var pathRight = {
			hLength: baseHLength + offset,
			startVLength: goingDown ? startVLength : -startVLength,
			endVLength: goingDown ? endVLength : -endVLength
		};

		if (!pathIntersectsNodesVertical(sourceBlock, destBlock, pathRight, sourceLeft, sourceTop, sourceWidth, sourceHeight,
		                                destLeft, destTop, destWidth, destHeight, goingDown)) {
			return pathRight;
		}

		// Try negative offset
		var pathLeft = {
			hLength: baseHLength - offset,
			startVLength: goingDown ? startVLength : -startVLength,
			endVLength: goingDown ? endVLength : -endVLength
		};

		if (!pathIntersectsNodesVertical(sourceBlock, destBlock, pathLeft, sourceLeft, sourceTop, sourceWidth, sourceHeight,
		                                destLeft, destTop, destWidth, destHeight, goingDown)) {
			return pathLeft;
		}
	}

	// If no clear path found, return the direct path as fallback
	return directPath;
}

/**
 * Check if a proposed vertical path intersects with any nodes
 */
function pathIntersectsNodesVertical(sourceBlock, destBlock, path, sourceLeft, sourceTop, sourceWidth, sourceHeight,
                                    destLeft, destTop, destWidth, destHeight, goingDown) {
	var sourceX = sourceLeft + sourceWidth / 2;
	var sourceY = goingDown ? sourceTop + sourceHeight : sourceTop;

	var cornerY = sourceY + path.startVLength * (goingDown ? 1 : -1);
	var cornerX = sourceX + path.hLength;

	var destX = destLeft + destWidth / 2;
	var destY = goingDown ? destTop : destTop + destHeight;

	// Check three segments of the path
	// 1. Vertical from source to corner
	if (lineIntersectsNodes(sourceX, sourceY, sourceX, cornerY, sourceBlock)) return true;

	// 2. Horizontal from corner to destination level
	if (lineIntersectsNodes(sourceX, cornerY, cornerX, cornerY, sourceBlock)) return true;

	// 3. Vertical from corner to destination
	if (lineIntersectsNodes(cornerX, cornerY, destX, destY, destBlock)) return true;

	return false;
}

/**
 * Check if two lines intersect
 */
function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
	var denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
	if (denom === 0) return false; // parallel lines

	var t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
	var u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

	return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function stopDrag(e) {
	isdrag = false;
	canvasPanning = false;
	canvasScrolling = false;
	initialBlockPositions = [];

	// Final repaint of all connectors after dragging stops
	if (canvases && canvases.length > 0) {
		var canvas = canvases[0];
		for (var i = 0; i < canvas.connectors.length; i++) {
			canvas.connectors[i].repaint();
		}
	}

	if (elementToMove)
		elementToMove.style.zIndex=originalZIndex;
	elementToMove = null;
	document.onmousemove = null;
}

/**
 * Find the canvas element from a given element
 */
function findCanvasElement(element) {
	while (element && element != document.body) {
		if (hasClass(element, "canvas")) {
			return element;
		}
		element = nn6 ? element.parentNode : element.parentElement;
	}
	return null;
}

document.onmousedown = startDrag;
document.onmouseup = stopDrag;

function touch2move (x) {
	var ev = {}
	ev.target = x.target;
	ev.clientX = x.targetTouches[0].pageX;
	ev.clientY = x.targetTouches[0].pageY;
	return ev;
}
document.ontouchstart = function(x) {
	if (x.touches.length >1) return;
	startDrag(touch2move (x));
	isdrag = true;
}
document.ontouchmove = function(x) {
	if (x.touches.length >1) return;
	isdrag = true;
	if (canvasScrolling) {
		scrollCanvas(touch2move (x));
	} else {
		movemouse (touch2move (x));
	}
	x.preventDefault();
}
document.ontouchend = stopDrag;

/**
 * Handle mouse wheel scrolling on canvas
 */
function handleMouseWheel(e) {
	var canvasElement = findCanvasElement(nn6 ? e.target : event.srcElement);
	if (canvasElement) {
		var delta = 0;
		if (e.wheelDelta) {
			delta = e.wheelDelta / 120; // Normalize for different browsers
		} else if (e.detail) {
			delta = -e.detail / 3; // Firefox
		}

		// Scroll vertically by default, horizontally with shift key
		var scrollSpeed = 30;
		if (e.shiftKey) {
			canvasElement.scrollLeft -= delta * scrollSpeed;
		} else {
			canvasElement.scrollTop -= delta * scrollSpeed;
		}

		// Prevent default browser scrolling
		if (e.preventDefault) {
			e.preventDefault();
		}
		e.returnValue = false;
		return false;
	}
}

// Add mouse wheel event listeners
if (window.addEventListener) {
	window.addEventListener('DOMMouseScroll', handleMouseWheel, false);
	window.addEventListener('mousewheel', handleMouseWheel, false);
} else {
	window.onmousewheel = handleMouseWheel;
}

/**
 * Handle keyboard shortcuts for zoom
 */
document.onkeydown = function(e) {
	var key = e.keyCode || e.which;

	// Ctrl + '+' or Ctrl + '=' for zoom in
	if ((e.ctrlKey || e.metaKey) && (key === 187 || key === 107)) {
		e.preventDefault();
		zoomIn();
		return false;
	}

	// Ctrl + '-' for zoom out
	if ((e.ctrlKey || e.metaKey) && (key === 189 || key === 109)) {
		e.preventDefault();
		zoomOut();
		return false;
	}

	// Ctrl + '0' for reset zoom
	if ((e.ctrlKey || e.metaKey) && key === 48) {
		e.preventDefault();
		resetZoom();
		return false;
	}
};



/*************
 * Constants *
 *************/
var LEFT = 1;
var RIGHT = 2;
var UP = 4;
var DOWN = 8;
var HORIZONTAL = LEFT + RIGHT;
var VERTICAL = UP + DOWN;
var AUTO = HORIZONTAL + VERTICAL;

var START = 0;
var END = 1;
var SCROLLBARS_WIDTH = 18;

/**************
 * Inspectors *
 **************/

var inspectors = new Array();

/**
 * The canvas class.
 * This class is built on a div html element.
 */
function Canvas(htmlElement) {
	/*
	 * initialization
	 */
	this.id = htmlElement.id;
	this.htmlElement = htmlElement;
	this.blocks = new Array();
	this.connectors = new Array();
	this.offsetLeft = calculateOffsetLeft(this.htmlElement);
	this.offsetTop = calculateOffsetTop(this.htmlElement);	
	
	this.width;
	this.height;

	// create the inner div element
	this.innerDiv = document.createElement ("div");
	
	this.initCanvas = function() {
		// setup the inner div
		var children = this.htmlElement.childNodes;
		var el;
		var n = children.length;
		for(var i = 0; i < n; i++) {
			el = children[0];
			this.htmlElement.removeChild(el);
			this.innerDiv.appendChild(el);
			if(el.style)
				el.style.zIndex = "2";
		}
		this.htmlElement.appendChild(this.innerDiv);

		this.htmlElement.style.overflow = "auto";
		this.htmlElement.style.position = "relative";
		this.innerDiv.id = this.id + "_innerDiv";
		this.innerDiv.style.border = "none";
		this.innerDiv.style.padding = "0px";
		this.innerDiv.style.margin = "0px";
		this.innerDiv.style.position = "absolute";
		this.innerDiv.style.top = "0px";
		this.innerDiv.style.left = "0px";
		this.width = 0;
		this.height = 0;
		this.offsetLeft = calculateOffsetLeft(this.innerDiv);
		this.offsetTop = calculateOffsetTop(this.innerDiv);

		// inspect canvas children to identify first level blocks
		new DocumentScanner(this, true).scan(this.htmlElement);
		
		// now this.width and this.height are populated with minimum values needed for the inner
		// blocks to fit, add 2 to avoid border overlap;
		this.height += 2;
		this.width += 2;
		
		var visibleWidth = this.htmlElement.offsetWidth - 2; // - 2 is to avoid border overlap
		var visibleHeight = this.htmlElement.offsetHeight - 2; // - 2 is to avoid border overlap
		
		// consider the scrollbars width calculating the inner div size
		if(this.height > visibleHeight)
			visibleWidth -= SCROLLBARS_WIDTH;
		if(this.width > visibleWidth)
			visibleHeight -= SCROLLBARS_WIDTH;
			
		this.height = Math.max(this.height, visibleHeight);
		this.width = Math.max(this.width, visibleWidth);

		// Add massive extra space for infinite scrolling
		var scrollMargin = 10000; // Large space for infinite scrolling in all directions
		this.width += scrollMargin;
		this.height += scrollMargin;

		this.innerDiv.style.width = this.width + "px";
		this.innerDiv.style.height = this.height + "px";
		
		// init connectors
		for(i = 0; i < this.connectors.length; i++) {
			this.connectors[i].initConnector();
		}
	}
	
	this.visit = function(element) {
		if (element == this.htmlElement)
			return true;
	
		// check the element dimensions against the acutal size of the canvas
		this.width = Math.max(this.width, calculateOffsetLeft(element) - this.offsetLeft + element.offsetWidth);
		this.height = Math.max(this.height, calculateOffsetTop(element) - this.offsetTop + element.offsetHeight);
		
		if(isBlock(element)) {
			// block found initialize it
			var newBlock = new Block(element, this);
			newBlock.initBlock();
			this.blocks.push(newBlock);
			return false;
		} else if(isConnector(element)) {
			// connector found, just create it, source or destination blocks may not 
			// have been initialized yet
			var newConnector = new Connector(element, this);
			this.connectors.push(newConnector);
			return false;
		} else {
			// continue searching nested elements
			return true;
		}
	}
	
	/*
	 * methods
	 */	
	this.print = function()
	{
		var output = '<ul><legend>canvas: ' + this.id + '</legend>';
		var i;
		for(i = 0; i < this.blocks.length; i++)
		{
			output += '<li>';
			output += this.blocks[i].print();
			output += '</li>';
		}
		output += '</ul>';
		return output;
	}
	
 	this.alignBlocks = function() {
 		// Use control flow graph layout instead of simple vertical stacking
 		layoutControlFlowGraph(this.blocks, this.connectors, this);

 		// Repaint connectors after layout
 		for (var i = 0; i < this.connectors.length; i++) {
 			this.connectors[i].repaint();
 		}
 	}

	this.fitBlocks = function() {
		for (var i = 0; i < this.blocks.length ; i++) {
			var b = this.blocks[i]; //.findBlock(blockId);
			this.blocks[i].fit ();
		}
	}
	/*
	 * This function searches for a nested block with a given id
	 */
	this.findBlock = function(blockId) {
		var result;
		for(var i = 0; i < this.blocks.length && !result; i++)
			result = this.blocks[i].findBlock(blockId);
		return result;
	}
	
	this.toString = function() {
		return 'canvas: ' + this.id;		
	}
}

/*
 * Block class
 */
function Block(htmlElement, canvas)
{	
	/*
	 * initialization
	 */
	 
	this.canvas = canvas;
	this.htmlElement = htmlElement;
	this.id = htmlElement.id;
	this.blocks = new Array();
	this.moveListeners = new Array();
	
	if(this.id == 'description2_out1')
		var merda = 0;
	this.currentTop = calculateOffsetTop(this.htmlElement) - this.canvas.offsetTop;
	this.currentLeft = calculateOffsetLeft(this.htmlElement) - this.canvas.offsetLeft;
	
	this.visit = function(element) {
		if (element == this.htmlElement) {
			// exclude itself
			return true;
		}
		if (isBlock(element)) {
			var innerBlock = new Block(element, this.canvas);
			innerBlock.initBlock();
			this.blocks.push(innerBlock);
			this.moveListeners.push(innerBlock);
			return false;
		}
		return true;
	}
	
	this.initBlock = function() {
		// inspect block children to identify nested blocks
		new DocumentScanner(this, true).scan(this.htmlElement);
	}
	
	this.top = function() {
		return this.currentTop;
	}
	
	this.left = function() {
		return this.currentLeft;
	}
	
	this.width = function() {
		return this.htmlElement.offsetWidth;		
	}
	
	this.height = function() {
		return this.htmlElement.offsetHeight;
	}
	
	/*
	 * methods
	 */	
	this.print = function() {
		var output = 'block: ' + this.id;
		if (this.blocks.length > 0) {
			output += '<ul>';
			for(var i = 0; i < this.blocks.length; i++) {
				output += '<li>';
				output += this.blocks[i].print();
				output += '</li>';
			}
			output += '</ul>';
		}
		return output;
	}
	
	/*
	 * This function searches for a nested block (or the block itself) with a given id
	 */
	this.findBlock = function(blockId) {
		if(this.id == blockId)
			return this;
		var result;
		for(var i = 0; i < this.blocks.length && !result; i++)
			result = this.blocks[i].findBlock(blockId);
		return result;
	}

    this.fit = function() {
        // Measure title and body to size the block accurately
        var titleEl = this.htmlElement.querySelector('.node-title');
        var bodyEl = this.htmlElement.querySelector('.node-body');
        var preEl = this.htmlElement.querySelector('.node-body pre');

        // Read min/max width from computed styles
        function toPx(v, defVal) {
            if (!v || v === 'none' || v === 'auto') return defVal;
            if (v.endsWith('px')) return parseFloat(v);
            var n = parseFloat(v);
            return isNaN(n) ? defVal : n;
        }

        var cs = window.getComputedStyle(this.htmlElement);
        var minW = toPx(cs.getPropertyValue('min-width'), 120);
        var maxW = Math.max(minW, toPx(cs.getPropertyValue('max-width'), 600));
        var borderW = toPx(cs.getPropertyValue('border-left-width'), 0) + toPx(cs.getPropertyValue('border-right-width'), 0);
        var paddingW = toPx(cs.getPropertyValue('padding-left'), 0) + toPx(cs.getPropertyValue('padding-right'), 0);

        // Temporarily let content define height; we control width only
        this.htmlElement.style.height = 'auto';

        // Compute desired width based on content
        var contentWidth = 0;
        if (titleEl) contentWidth = Math.max(contentWidth, titleEl.scrollWidth);
        if (preEl) contentWidth = Math.max(contentWidth, preEl.scrollWidth);
        if (bodyEl) contentWidth = Math.max(contentWidth, bodyEl.scrollWidth);

        // Add horizontal paddings and borders
        var desiredWidth = Math.ceil(contentWidth + paddingW + borderW + 8);
        desiredWidth = Math.min(maxW, Math.max(minW, desiredWidth));

        // Apply width and let browser compute final height
        this.htmlElement.style.width = desiredWidth + 'px';

        // Ensure minimum height for very small nodes
        var minH = 30;
        if (this.htmlElement.offsetHeight < minH) {
            this.htmlElement.style.height = minH + 'px';
        }

        // Notify listeners so connectors reposition to new size
        this.onMove();
    }
	
	this.move = function(left, top) {
		this.htmlElement.style.left = left;
		this.htmlElement.style.top = top;
		this.onMove();
	}
		
	this.onMove = function() {
		this.currentLeft = calculateOffsetLeft(this.htmlElement) - this.canvas.offsetLeft;
		this.currentTop = calculateOffsetTop(this.htmlElement) - this.canvas.offsetTop;
		// notify listeners
		for(var i = 0; i < this.moveListeners.length; i++)
			this.moveListeners[i].onMove();
	}
	
	this.toString = function() {
		return 'block: ' + this.id;
	}
}

/**
 * This class represents a connector segment, it is drawn via a div element.
 * A segment has a starting point defined by the properties startX and startY, a length,
 * a thickness and an orientation.
 * Allowed values for the orientation property are defined by the constants UP, LEFT, DOWN and RIGHT.
 */
function Segment(id, parentElement)
{
	this.id = id;
	this.htmlElement = document.createElement('div');
	this.htmlElement.id = id;
	this.htmlElement.style.position = 'absolute';
	this.htmlElement.style.overflow = 'hidden';
	parentElement.appendChild(this.htmlElement);

	this.startX;
	this.startY;
	this.length;
	this.thickness;
	this.orientation;
	this.nextSegment;
	this.visible = true;
	
	/**
	 * draw the segment. This operation is cascaded to next segment if any.
	 */
	this.draw = function()
	{
		// set properties to next segment
		if(this.nextSegment)
		{
			this.nextSegment.startX = this.getEndX();
			this.nextSegment.startY = this.getEndY();
		}
		
		this.htmlElement.style.display = this.visible?'block':'none';
	
		switch (this.orientation) {
		case LEFT:
			this.htmlElement.style.left = (this.startX - this.length) + "px";				
			this.htmlElement.style.top = this.startY + "px";
			this.htmlElement.style.width = this.length + "px";
			this.htmlElement.style.height = this.thickness + "px";
			break;
		case RIGHT:
			this.htmlElement.style.left = this.startX + "px";
			this.htmlElement.style.top = this.startY + "px";
			if(this.nextSegment)
				this.htmlElement.style.width = this.length + this.thickness + "px";
			else
				this.htmlElement.style.width = this.length + "px";
			this.htmlElement.style.height = this.thickness + "px";
			break;
		case UP:
			this.htmlElement.style.left = this.startX + "px";
			this.htmlElement.style.top = (this.startY - this.length) + "px";
			this.htmlElement.style.width = this.thickness + "px";
			this.htmlElement.style.height = this.length + "px";
			break;
		case DOWN:
			this.htmlElement.style.left = this.startX + "px";
			this.htmlElement.style.top = this.startY + "px";
			this.htmlElement.style.width = this.thickness + "px";
			if(this.nextSegment)
				this.htmlElement.style.height = this.length + this.thickness + "px";
			else
				this.htmlElement.style.height = this.length + "px";
			break;
		}
		
		if(this.nextSegment)
			this.nextSegment.draw();
	}
	
	/**
	 * Returns the "left" coordinate of the end point of this segment
	 */
	this.getEndX = function()
	{		
		switch(this.orientation)
		{
			case LEFT: return this.startX - this.length;
			case RIGHT: return this.startX + this.length;
			case DOWN: return this.startX;
			case UP: return this.startX;
		}
	}
	
	/**
	 * Returns the "top" coordinate of the end point of this segment
	 */
	this.getEndY = function() {		
		switch (this.orientation) {
		case LEFT: return this.startY;
		case RIGHT: return this.startY;
		case DOWN: return this.startY + this.length;
		case UP: return this.startY - this.length;
		}
	}
		
	/**
	 * Append another segment to the end point of this.
	 * If another segment is already appended to this, cascades the operation so
	 * the given next segment will be appended to the tail of the segments chain.
	 */
	this.append = function(nextSegment) {
		if(!nextSegment)
			return;
		if(!this.nextSegment) {
			this.nextSegment = nextSegment;
			this.nextSegment.startX = this.getEndX();
			this.nextSegment.startY = this.getEndY();
		} else this.nextSegment.append(nextSegment);
	}
	
	this.detach = function() {
		var s = this.nextSegment;
		this.nextSegment = null;
		return s;
	}
	
	/**
	 * hides this segment and all the following
	 */
	this.cascadeHide = function() {
		this.visible = false;
		if(this.nextSegment)
			this.nextSegment.cascadeHide();
	}
}
/**
 * Connector class.
 * The init function takes two Block objects as arguments representing 
 * the source and destination of the connector
 */
function Connector(htmlElement, canvas)
{
	/**
	 * declaring html element
	 */
	this.htmlElement = htmlElement;
	
	/**
	 * the canvas this connector is in
	 */
	this.canvas = canvas;
	
	/**
	 * the source block
	 */
	this.source = null;
	
	/**
	 * the destination block
	 */
	this.destination = null;	
	
	/**
	 * preferred orientation
	 */
	this.preferredSourceOrientation = AUTO;
	this.preferredDestinationOrientation = AUTO;
	
	/**
	 * css class to be applied to the connector's segments
	 */
	this.connectorClass;
	
	/**
	 * minimum length for a connector segment.
	 */
	this.minSegmentLength = 10;

	/**
	 * size of the connector, i.e.: thickness of the segments.
	 */
	this.size = 1;
	
	/**
	 * connector's color
	 */
	this.color = 'black';
	
	/**
	 * move listeners, they are notify when connector moves
	 */
	this.moveListeners = new Array();
	
	this.firstSegment;
	
	this.segmentsPool;
	
	this.segmentsNumber = 0;
	
	this.strategy;
		
	this.initConnector = function()
	{
		// detect the connector id
		if(this.htmlElement.id)
			this.id = this.htmlElement.id;
		else
			this.id = this.htmlElement.className;
			
		// split the class name to get the ids of the source and destination blocks
		var splitted = htmlElement.className.split(' ');
		if(splitted.length < 3)
		{
				console.warn('Unable to create connector: expected "connector <sourceBlockId> <destBlockId>"');
			return;
		}
		
		this.connectorClass = splitted[0] + ' ' + splitted[1] + ' ' + splitted[2];
		
		this.source = this.canvas.findBlock(splitted[1]);
		if(!this.source)
		{
				console.warn('Cannot find source block with id \'' + splitted[1] + '\'');
			return;
		}
		
			this.destination = this.canvas.findBlock(splitted[2]);
			if(!this.destination)
			{
				console.warn('Cannot find destination block with id \'' + splitted[2] + '\'');
				return;
			}
		
		// check preferred orientation
		if(hasClass(this.htmlElement, 'vertical'))
		{
			this.preferredSourceOrientation = VERTICAL;
			this.preferredDestinationOrientation = VERTICAL;
		}
		else if(hasClass(this.htmlElement, 'horizontal'))
		{
			this.preferredSourceOrientation = HORIZONTAL;
			this.preferredDestinationOrientation = HORIZONTAL;
		}
		else
		{
			// check preferred orientation on source side
			if(hasClass(this.htmlElement, 'vertical_start'))
				this.preferredSourceOrientation = VERTICAL;
			else if(hasClass(this.htmlElement, 'horizontal_start'))
				this.preferredSourceOrientation = HORIZONTAL;
			else if(hasClass(this.htmlElement, 'left_start'))
				this.preferredSourceOrientation = LEFT;
			else if(hasClass(this.htmlElement, 'right_start'))
				this.preferredSourceOrientation = RIGHT;
			else if(hasClass(this.htmlElement, 'up_start'))
				this.preferredSourceOrientation = UP;
			else if(hasClass(this.htmlElement, 'down_start'))
				this.preferredSourceOrientation = DOWN;
			
			// check preferred orientation on destination side
			if(hasClass(this.htmlElement, 'vertical_end'))
				this.preferredDestinationOrientation = VERTICAL;
			else if(hasClass(this.htmlElement, 'horizontal_end'))
				this.preferredDestinationOrientation = HORIZONTAL;
			else if(hasClass(this.htmlElement, 'left_end'))
				this.preferredDestinationOrientation = LEFT;
			else if(hasClass(this.htmlElement, 'right_end'))
				this.preferredDestinationOrientation = RIGHT;
			else if(hasClass(this.htmlElement, 'up_end'))
				this.preferredDestinationOrientation = UP;
			else if(hasClass(this.htmlElement, 'down_end'))
				this.preferredDestinationOrientation = DOWN;
		}
		
		// get the first strategy as default
		this.strategy = strategies[0](this);
		this.repaint();
		
		this.source.moveListeners.push(this);
		this.destination.moveListeners.push(this);
		
		// call inspectors for this connector
		var i;
		for(i = 0; i < inspectors.length; i++)
		{
			inspectors[i].inspect(this);
		}
		
		// remove old html element
		this.htmlElement.parentNode.removeChild(this.htmlElement);
	}
	
	this.getStartSegment = function() {
		return this.firstSegment;
	}
	
	this.getEndSegment = function() {
		var s = this.firstSegment;
		while (s.nextSegment)
			s = s.nextSegment;
		return s;
	}
	
	this.getMiddleSegment = function() {
		return this.strategy?  this.strategy.getMiddleSegment(): null;
	}
	
	this.createSegment = function() {
		var segment;
		
		// if the pool contains more objects, borrow the segment, create it otherwise
		if(this.segmentsPool) {
			segment = this.segmentsPool;
			this.segmentsPool = this.segmentsPool.detach();
		} else {		
			segment = new Segment(this.id + "_" + (this.segmentsNumber + 1), this.canvas.htmlElement);
			segment.htmlElement.className = this.connectorClass;
			if(!getStyle(segment.htmlElement, 'background-color'))
				segment.htmlElement.style.backgroundColor = this.color;
			segment.thickness = this.size;
		}
		this.segmentsNumber++;
		
		if(this.firstSegment)
			this.firstSegment.append(segment);
		else
			this.firstSegment = segment;
		segment.visible = true;
		return segment;
	}
	
	/**
	 * Repaints the connector
	 */
	this.repaint = function() {
		// check strategies fitness and choose the best fitting one
		var maxFitness = 0;
		var fitness;
		var s;
		
		// check if any strategy is possible with preferredOrientation
		for(var i = 0; i < strategies.length; i++) {
			this.clearSegments();
			
			fitness = 0;
			s = strategies[i](this);
			if(s.isApplicable()) {
				fitness++;
				s.paint();
				// check resulting orientation against the preferred orientations
				if((this.firstSegment.orientation & this.preferredSourceOrientation) != 0)
					fitness++;
				if((this.getEndSegment().orientation & this.preferredDestinationOrientation) != 0)
					fitness++;
			}
			
			if(fitness > maxFitness) {
				this.strategy = s;
				maxFitness = fitness;
			}
		}			
		
		this.clearSegments();

		this.strategy.paint();
		this.firstSegment.draw();

		// this is needed to actually hide unused html elements	
		if(this.segmentsPool)
			this.segmentsPool.draw();
	}
	
	/**
	 * Hide all the segments and return them to pool
	 */
	this.clearSegments = function() {
		if (this.firstSegment) {
			this.firstSegment.cascadeHide();
			this.firstSegment.append(this.segmentsPool);
			this.segmentsPool = this.firstSegment;
			this.firstSegment = null;
		}	
	}
		
	this.onMove = function() {
		this.repaint();
		// notify listeners
		for (var i = 0; i < this.moveListeners.length; i++)
			this.moveListeners[i].onMove();
	}
}

var strategies = new Array();

function ConnectorEnd(htmlElement, connector, side) {
	this.side = side;
	this.htmlElement = htmlElement;
	this.connector = connector;
	connector.canvas.htmlElement.appendChild(htmlElement);
	// strip extension
	if(this.htmlElement.tagName.toLowerCase() == "img")
	{
		this.src = this.htmlElement.src.substring(0, this.htmlElement.src.lastIndexOf('.'));
		this.srcExtension = this.htmlElement.src.substring(this.htmlElement.src.lastIndexOf('.'));
		this.htmlElement.style.zIndex = getStyle(this.connector.htmlElement, "z-index");
	}
	
	this.orientation;
	
	this.repaint = function() {
		this.htmlElement.style.position = 'absolute';
				
		var left;
		var top;
		var segment;
		var orientation;
		
		if(this.side == START) {
			segment = connector.getStartSegment();
			left = segment.startX;
			top = segment.startY;
			orientation = segment.orientation;
			// swap orientation
			if((orientation & VERTICAL) != 0)
				orientation = (~orientation) & VERTICAL;
			else
				orientation = (~orientation) & HORIZONTAL;
		} else {
			segment = connector.getEndSegment();
			left = segment.getEndX();
			top = segment.getEndY();
			orientation = segment.orientation;
		}
		
		switch(orientation) {
		case LEFT:
			top -= (this.htmlElement.offsetHeight - segment.thickness) / 2;
			break;
		case RIGHT:
			left -= this.htmlElement.offsetWidth;
			top -= (this.htmlElement.offsetHeight - segment.thickness) / 2;
			break;
		case DOWN:
			top -= this.htmlElement.offsetHeight;
			left -= (this.htmlElement.offsetWidth - segment.thickness) / 2;
			break;
		case UP:
			left -= (this.htmlElement.offsetWidth - segment.thickness) / 2;
			break;
		}
		
		this.htmlElement.style.left = Math.ceil(left) + "px";
		this.htmlElement.style.top = Math.ceil(top) + "px";
		
		if(this.htmlElement.tagName.toLowerCase() == "img" && this.orientation != orientation)
		{
			var orientationSuffix;
			switch(orientation)
			{
				case UP: orientationSuffix = "u"; break;
				case DOWN: orientationSuffix = "d"; break;
				case LEFT: orientationSuffix = "l"; break;
				case RIGHT: orientationSuffix = "r"; break;
			}
			this.htmlElement.src = this.src + "_" + orientationSuffix + this.srcExtension;
		}
		this.orientation = orientation;
	}
	
	this.onMove = function()
	{
		this.repaint();
	}
}

function SideConnectorLabel(connector, htmlElement, side)
{
	this.connector = connector;
	this.htmlElement = htmlElement;
	this.side = side;
	this.connector.htmlElement.parentNode.appendChild(htmlElement);
		
	this.repaint = function()
	{
		this.htmlElement.style.position = 'absolute';
		var left;
		var top;
		var segment;

		if(this.side == START)
		{	
			segment = this.connector.getStartSegment();
			left = segment.startX;
			top = segment.startY;
			if(segment.orientation == LEFT)
				left -= this.htmlElement.offsetWidth;
			if(segment.orientation == UP)
				top -= this.htmlElement.offsetHeight;
				
			if((segment.orientation & HORIZONTAL) != 0 && top < this.connector.getEndSegment().getEndY())
				top -= this.htmlElement.offsetHeight;
			if((segment.orientation & VERTICAL) != 0 && left < this.connector.getEndSegment().getEndX())
				left -= this.htmlElement.offsetWidth;
		}
		else
		{	
			segment = this.connector.getEndSegment();
			left = segment.getEndX();
			top = segment.getEndY();
			if(segment.orientation == RIGHT)
				left -= this.htmlElement.offsetWidth;
			if(segment.orientation == DOWN)
				top -= this.htmlElement.offsetHeight;
			if((segment.orientation & HORIZONTAL) != 0 && top < this.connector.getStartSegment().startY)
				top -= this.htmlElement.offsetHeight;
			if((segment.orientation & VERTICAL) != 0 && left < this.connector.getStartSegment().startX)
				left -= this.htmlElement.offsetWidth;
		}
		
		this.htmlElement.style.left = Math.ceil(left) + "px";
		this.htmlElement.style.top = Math.ceil(top) + "px";
	}
	
	this.onMove = function()
	{
		this.repaint();
	}
}

function MiddleConnectorLabel(connector, htmlElement)
{
	this.connector = connector;
	this.htmlElement = htmlElement;
	this.connector.canvas.htmlElement.appendChild(htmlElement);
	
	this.repaint = function()
	{
		this.htmlElement.style.position = 'absolute';
		
		var left;
		var top;
		var segment = connector.getMiddleSegment();

		if((segment.orientation & VERTICAL) != 0)
		{
			// put label at middle height on right side of the connector
			top = segment.htmlElement.offsetTop + (segment.htmlElement.offsetHeight - this.htmlElement.offsetHeight) / 2;
			left = segment.htmlElement.offsetLeft;
		}
		else
		{
			// put connector below the connector at middle widths
			top = segment.htmlElement.offsetTop;
			left = segment.htmlElement.offsetLeft + (segment.htmlElement.offsetWidth - this.htmlElement.offsetWidth) / 2;;
		}
		
		this.htmlElement.style.left = Math.ceil(left) + "px";
		this.htmlElement.style.top = Math.ceil(top) + "px";
	}
	
	this.onMove = function()
	{
		this.repaint();
	}
}

/*
 * Inspector classes
 */

function ConnectorEndsInspector()
{
	this.inspect = function(connector)
	{
		var children = connector.htmlElement.childNodes;
		var i;
		for(i = 0; i < children.length; i++)
		{
			if(hasClass(children[i], "connector-end"))
			{
				var newElement = new ConnectorEnd(children[i], connector, END);
				newElement.repaint();
				connector.moveListeners.push(newElement);
			}
			else if(hasClass(children[i], "connector-start"))
			{
				var newElement = new ConnectorEnd(children[i], connector, START);
				newElement.repaint();
				connector.moveListeners.push(newElement);
			}
		}
	}
}

function ConnectorLabelsInspector()
{
	this.inspect = function(connector)
	{
		var children = connector.htmlElement.childNodes;
		var i;
		for(i = 0; i < children.length; i++)
		{
			if(hasClass(children[i], "source-label"))
			{
				var newElement = new SideConnectorLabel(connector, children[i], START);
				newElement.repaint();
				connector.moveListeners.push(newElement);
			}
			else if(hasClass(children[i], "middle-label"))
			{
				var newElement = new MiddleConnectorLabel(connector, children[i]);
				newElement.repaint();
				connector.moveListeners.push(newElement);
			}
			else if(hasClass(children[i], "destination-label"))
			{
				var newElement = new SideConnectorLabel(connector, children[i], END);
				newElement.repaint();
				connector.moveListeners.push(newElement);
			}
		}
	}
}

/*
 * Inspector registration
 */

inspectors.push(new ConnectorEndsInspector());
inspectors.push(new ConnectorLabelsInspector());

/*
 * an array containing all the canvases in document
 */
var canvases = new Array();

/*
 * This function initializes the js_graph objects inspecting the html document
 */
function initPageObjects()
{
	if(isCanvas(document.body))
	{
		var newCanvas = new Canvas(document.body);
		newCanvas.initCanvas();
		canvases.push(newCanvas);
	}
	else
	{	
		var divs = document.getElementsByTagName('div');
		var i;
		for(i = 0; i < divs.length; i++)
		{
			if(isCanvas(divs[i]) && !findCanvas(divs[i].id))
			{
				var newCanvas = new Canvas(divs[i]);
				newCanvas.initCanvas();
				canvases.push(newCanvas);
				// Size blocks to their contents
				try { newCanvas.fitBlocks(); } catch (e) { console.error('fitBlocks failed', e); }
				// Try improved layout; if it fails, use a simple grid fallback
				try {
					newCanvas.alignBlocks();
				} catch (e) {
					console.error('alignBlocks failed, using fallback layout', e);
					fallbackAlignBlocks(newCanvas);
				}
			}
		}
	}
}

// Very simple, safe fallback layout: place blocks in rows
function fallbackAlignBlocks(canvas) {
    var x = 20, y = 20;
    var rowH = 0;
    var gapX = 40, gapY = 60;
    var maxW = canvas.htmlElement.clientWidth || 800;
    for (var i = 0; i < canvas.blocks.length; i++) {
        var b = canvas.blocks[i];
        var w = b.width();
        var h = b.height();
        if (x + w > maxW - 20) { x = 20; y += rowH + gapY; rowH = 0; }
        b.move(x, y);
        x += w + gapX;
        rowH = Math.max(rowH, h);
    }
    for (var j = 0; j < canvas.connectors.length; j++) {
        try { canvas.connectors[j].repaint(); } catch(e) { /* ignore */ }
    }
}


/*
 * Utility functions
 */

function findCanvas(canvasId) {	
	for (var i = 0; i < canvases.length; i++)
		if(canvases[i].id == canvasId)
			return canvases[i];
	return null;
}

function findBlock(blockId) {
	for (var i = 0; i < canvases.length; i++) {
		var block = canvases[i].findBlock(blockId);
		if (block) return block;
	}
	return null;
}
 
/*
 * This function determines whether a html element is to be considered a canvas
 */
function isBlock(htmlElement)
{
	return hasClass(htmlElement, 'block');
}

/*
 * This function determines whether a html element is to be considered a block
 */
function isCanvas(htmlElement) {
	return hasClass(htmlElement, 'canvas');
}

/*
 * This function determines whether a html element is to be considered a connector
 */
function isConnector(htmlElement) {
	return htmlElement.className && htmlElement.className.match(new RegExp('connector .*'));
}

/*
 * This function calculates the absolute 'top' value for a html node
 */
function calculateOffsetTop(obj) {
	var curtop = 0;
	if (obj.offsetParent) {
		curtop = obj.offsetTop
		while (obj = obj.offsetParent) 
			curtop += obj.offsetTop
	} else if (obj.y)
		curtop += obj.y;
	return curtop;
}

/*
 * This function calculates the absolute 'left' value for a html node
 */
function calculateOffsetLeft(obj)
{
	var curleft = 0;
	if (obj.offsetParent) {
		curleft = obj.offsetLeft
		while (obj = obj.offsetParent) 
			curleft += obj.offsetLeft;
	} else if (obj.x)
		curleft += obj.x;
	return curleft;
}

function parseBorder(obj, side) {
	var sizeString = getStyle(obj, "border-" + side + "-width");
	if(sizeString && sizeString != "") {
		if(sizeString.substring(sizeString.length - 2) == "px")
			return parseInt(sizeString.substring(0, sizeString.length - 2));
	}
	return 0;
}

function hasClass(element, className) {
	if (!element || !element.className)
		return false;
		
	var classes = element.className.split(' ');
	for (var i = 0; i < classes.length; i++)
		if (classes[i] == className)
			return true;
	return false;
}

/**
 * This function retrieves the actual value of a style property even if it is set via css.
 */
function getStyle(node, styleProp) {
	// if not an element
	if( node.nodeType != 1)
		return;
		
	var value;
	if (node.currentStyle) {
		// ie case
		styleProp = replaceDashWithCamelNotation(styleProp);
		value = node.currentStyle[styleProp];
	} else if (window.getComputedStyle) {
		// mozilla case
		value = document.defaultView.getComputedStyle(node, null).getPropertyValue(styleProp);
	}
	
	return value;
}

function replaceDashWithCamelNotation(value) {
	var pos = value.indexOf('-');
	while(pos > 0 && value.length > pos + 1) {
		value = value.substring(0, pos) + value.substring(pos + 1, pos + 2).toUpperCase() + value.substring(pos + 2);
		pos = value.indexOf('-');
	}
	return value;
}
/*******************************
 * Connector paint strategies. *
 *******************************/

/**
 * Horizontal "S" routing strategy.
 */
function HorizontalSStrategy(connector) {
	this.connector = connector;
	this.startSegment;
	this.middleSegment;
	this.endSegment;
	this.strategyName = "horizontal_s";
	this.getMiddleSegment = function() {
		return this.middleSegment;
	}
	this.isApplicable = function() {
		var sourceLeft = this.connector.source.left();
		var sourceWidth = this.connector.source.width();
		var destinationLeft = this.connector.destination.left();
		var destinationWidth = this.connector.destination.width();
		
		return Math.abs(2 * destinationLeft + destinationWidth - (2 * sourceLeft + sourceWidth)) - (sourceWidth + destinationWidth) > 4 * this.connector.minSegmentLength;
	}
	
 	this.paint = function() {
 		this.startSegment = connector.createSegment();
 		this.middleSegment = connector.createSegment();
 		this.endSegment = connector.createSegment();

 		var sourceLeft = this.connector.source.left();
 		var sourceTop = this.connector.source.top();
 		var sourceWidth = this.connector.source.width();
 		var sourceHeight = this.connector.source.height();

 		var destinationLeft = this.connector.destination.left();
 		var destinationTop = this.connector.destination.top();
 		var destinationWidth = this.connector.destination.width();
 		var destinationHeight = this.connector.destination.height();

 		var hLength;

 		this.startSegment.startY = Math.floor(sourceTop + sourceHeight / 2);

 		// deduce which face to use on source and destination blocks
 		if(sourceLeft + sourceWidth / 2 < destinationLeft + destinationWidth / 2)
 		{
 			// use left side of the source block and right side of the destination block
 			this.startSegment.startX = sourceLeft + sourceWidth;
 			hLength = destinationLeft - (sourceLeft + sourceWidth);
 		}
 		else
 		{
 			// use right side of the source block and left side of the destination block
 			this.startSegment.startX = sourceLeft;
 			hLength = destinationLeft + destinationWidth - sourceLeft;
 		}

  		// Calculate vertical offset to avoid crossing nodes using collision detection
  		var sourceCenterY = sourceTop + sourceHeight / 2;
  		var destCenterY = destinationTop + destinationHeight / 2;
  		var vLength = destCenterY - sourceCenterY;

  		// Use collision detection to find a clear path
  		var path = findClearPath(this.connector.source, this.connector.destination, sourceLeft, sourceTop, sourceWidth, sourceHeight,
  		                        destinationLeft, destinationTop, destinationWidth, destinationHeight, hLength > 0);

  		// Apply the calculated path
  		vLength = path.vLength;
  		var startHLength = path.startHLength;
  		var endHLength = path.endHLength;

  		// first horizontal segment positioning
  		this.startSegment.length = Math.abs(startHLength);
  		this.startSegment.orientation = startHLength > 0 ? RIGHT : LEFT;

  		// vertical segment positioning
  		this.middleSegment.length = Math.abs(vLength);
  		if(vLength == 0)
  			this.middleSegment.visible = false;
  		this.middleSegment.orientation = vLength > 0 ? DOWN : UP;

  		// second horizontal segment positioning
  		this.endSegment.length = Math.abs(endHLength);
  		this.endSegment.orientation = endHLength > 0 ? RIGHT : LEFT;
 	}
}

/**
 * Vertical "S" routing strategy.
 */
function VerticalSStrategy(connector)
{
	this.connector = connector;
	
	this.startSegment;
	this.middleSegment;
	this.endSegment;
	
	this.strategyName = "vertical_s";
	
	this.getMiddleSegment = function()
	{
		return this.middleSegment;
	}	
	
	this.isApplicable = function()
	{
		var sourceTop = this.connector.source.top();
		var sourceHeight = this.connector.source.height();
		var destinationTop = this.connector.destination.top();
		var destinationHeight = this.connector.destination.height();
		return Math.abs(2 * destinationTop + destinationHeight - (2 * sourceTop + sourceHeight)) - (sourceHeight + destinationHeight) > 4 * this.connector.minSegmentLength;
	}
	
 	this.paint = function()
 	{
 		this.startSegment = connector.createSegment();
 		this.middleSegment = connector.createSegment();
 		this.endSegment = connector.createSegment();

 		var sourceLeft = this.connector.source.left();
 		var sourceTop = this.connector.source.top();
 		var sourceWidth = this.connector.source.width();
 		var sourceHeight = this.connector.source.height();

 		var destinationLeft = this.connector.destination.left();
 		var destinationTop = this.connector.destination.top();
 		var destinationWidth = this.connector.destination.width();
 		var destinationHeight = this.connector.destination.height();

 		var vLength;

 		this.startSegment.startX = Math.floor(sourceLeft + sourceWidth / 2);

 		// deduce which face to use on source and destination blocks
 		if(sourceTop + sourceHeight / 2 < destinationTop + destinationHeight / 2)
 		{
 			// use bottom side of the source block and top side of destination block
 			this.startSegment.startY = sourceTop + sourceHeight;
 			vLength = destinationTop - (sourceTop + sourceHeight);
 		}
 		else
 		{
 			// use top side of the source block and bottom side of the destination block
 			this.startSegment.startY = sourceTop;
 			vLength = destinationTop + destinationHeight - sourceTop;
 		}

  		// Calculate horizontal offset to avoid crossing nodes using collision detection
  		var sourceCenterX = sourceLeft + sourceWidth / 2;
  		var destCenterX = destinationLeft + destinationWidth / 2;
  		var baseHLength = destCenterX - sourceCenterX;

  		// Use collision detection to find a clear path
  		var path = findClearPathVertical(this.connector.source, this.connector.destination, sourceLeft, sourceTop, sourceWidth, sourceHeight,
  		                                destinationLeft, destinationTop, destinationWidth, destinationHeight, vLength > 0);

  		// Apply the calculated path
  		var hLength = path.hLength;
  		var startVLength = path.startVLength;
  		var endVLength = path.endVLength;

  		// first vertical segment positioning
  		this.startSegment.length = Math.abs(startVLength);
  		this.startSegment.orientation = startVLength > 0 ? DOWN : UP;

  		// horizontal segment positioning
  		this.middleSegment.length = Math.abs(hLength);
  		this.middleSegment.orientation = hLength > 0 ? RIGHT : LEFT;

  		// second vertical segment positioning
  		this.endSegment.length = Math.abs(endVLength);
  		this.endSegment.orientation = endVLength > 0 ? DOWN : UP;
 	}
}

/**
 * A horizontal "L" connector routing strategy
 */
function HorizontalLStrategy(connector)
{
	this.connector = connector;
	
	this.destination;
	
	this.startSegment;
	this.endSegment;
	
	this.strategyName = "horizontal_L";
	
	this.isApplicable = function()
	{
		var destMiddle = Math.floor(this.connector.destination.left() + this.connector.destination.width() / 2);
		var sl = this.connector.source.left();
		var sw = this.connector.source.width();
		var dt = this.connector.destination.top();
		var dh = this.connector.destination.height();
		var sourceMiddle = Math.floor(this.connector.source.top() + this.connector.source.height() / 2);

		if(destMiddle > sl && destMiddle < sl + sw)
			return false;
		if(sourceMiddle > dt && sourceMiddle < dt + dh)
			return false;
		return true;
	}
	
	/**
	 * Chooses the longest segment as the "middle" segment.
	 */
	this.getMiddleSegment = function()
	{
		if(this.startSegment.length > this.endSegment.length)
			return this.startSegment;
		else
			return this.endSegment;
	}
	
	this.paint = function()
	{
		this.startSegment = this.connector.createSegment();
		this.endSegment = this.connector.createSegment();
		
		var destMiddleX = Math.floor(this.connector.destination.left() + this.connector.destination.width() / 2);
		var sl = this.connector.source.left();
		var sw = this.connector.source.width();
		var dt = this.connector.destination.top();
		var dh = this.connector.destination.height();
		
		this.startSegment.startY = Math.floor(this.connector.source.top() + this.connector.source.height() / 2);
		
		// decide which side of the source block to connect to
		if(Math.abs(destMiddleX - sl) < Math.abs(destMiddleX - (sl + sw)))
		{
			// use the left face
			this.startSegment.orientation = (destMiddleX < sl) ? LEFT : RIGHT;				
			this.startSegment.startX = sl;
		}
		else
		{
			// use the right face
			this.startSegment.orientation = (destMiddleX > (sl + sw)) ? RIGHT : LEFT;
			this.startSegment.startX = sl + sw;
		}
		
		this.startSegment.length = Math.abs(destMiddleX - this.startSegment.startX);
		
		// decide which side of the destination block to connect to
		if(Math.abs(this.startSegment.startY - dt) < Math.abs(this.startSegment.startY - (dt + dh)))
		{
			// use the upper face
			this.endSegment.orientation = (this.startSegment.startY < dt) ? DOWN : UP;
			this.endSegment.length = Math.abs(this.startSegment.startY - dt);
		}
		else
		{
			// use the lower face
			this.endSegment.orientation = (this.startSegment.startY > (dt + dh)) ? UP : DOWN;
			this.endSegment.length = Math.abs(this.startSegment.startY - (dt + dh));
		}
	}
}

/**
 * Vertical "L" connector routing strategy
 */
function VerticalLStrategy(connector)
{
	this.connector = connector;
	
	this.startSegment;
	this.endSegment;
	
	this.strategyName = "vertical_L";
	
	this.isApplicable = function()
	{
		var sourceMiddle = Math.floor(this.connector.source.left() + this.connector.source.width() / 2);
		var dl = this.connector.destination.left();
		var dw = this.connector.destination.width();
		var st = this.connector.source.top();
		var sh = this.connector.source.height();
		var destMiddle = Math.floor(this.connector.destination.top() + this.connector.destination.height() / 2);

		if(sourceMiddle > dl && sourceMiddle < dl + dw)
			return false;
		if(destMiddle > st && destMiddle < st + sh)
			return false;
		return true;
	}
	/**
	 * Chooses the longest segment as the "middle" segment.
	 */
	this.getMiddleSegment = function() {
		if(this.startSegment.length > this.endSegment.length)
			return this.startSegment;
		return this.endSegment;
	}
	this.paint = function() {
		this.startSegment = this.connector.createSegment();
		this.endSegment = this.connector.createSegment();
		var destMiddleY = Math.floor(this.connector.destination.top() + this.connector.destination.height() / 2);
		var dl = this.connector.destination.left();
		var dw = this.connector.destination.width();
		var st = this.connector.source.top();
		var sh = this.connector.source.height();
		this.startSegment.startX = Math.floor(this.connector.source.left() + this.connector.source.width() / 2);
		// decide which side of the source block to connect to
		if(Math.abs(destMiddleY - st) < Math.abs(destMiddleY - (st + sh))) {
			// use the upper face
			this.startSegment.orientation = (destMiddleY < st) ? UP : DOWN;
			this.startSegment.startY = st;
		} else {
			// use the lower face
			this.startSegment.orientation = (destMiddleY > (st + sh)) ? DOWN : UP;
			this.startSegment.startY = st + sh;
		}
		
		this.startSegment.length = Math.abs(destMiddleY - this.startSegment.startY);
		
		// decide which side of the destination block to connect to
		if(Math.abs(this.startSegment.startX - dl) < Math.abs(this.startSegment.startX - (dl + dw)))
		{
			// use the left face
			this.endSegment.orientation = (this.startSegment.startX < dl) ? RIGHT : LEFT;
			this.endSegment.length = Math.abs(this.startSegment.startX - dl);
		}
		else
		{
			// use the right face
			this.endSegment.orientation = (this.startSegment.startX > dl + dw) ? LEFT : RIGHT;
			this.endSegment.length = Math.abs(this.startSegment.startX - (dl + dw));
		}
	}
}

function HorizontalCStrategy(connector, startOrientation)
{
	this.connector = connector;
	
	this.startSegment;
	this.middleSegment;
	this.endSegment;
	
	this.strategyName = "horizontal_c";
	
	this.getMiddleSegment = function() {
		return this.middleSegment;
	}	
	
	this.isApplicable = function() {
		return true;
	}
	
	this.paint = function()
	{
		this.startSegment = connector.createSegment();
		this.middleSegment = connector.createSegment();
		this.endSegment = connector.createSegment();
		
		var sign = 1;
		if(startOrientation == RIGHT)
			sign = -1;
		
		var startX = this.connector.source.left();
		if(startOrientation == RIGHT)
			startX += this.connector.source.width();
		var startY = Math.floor(this.connector.source.top() + this.connector.source.height() / 2);
		
		var endX = this.connector.destination.left();
		if(startOrientation == RIGHT)
			endX += this.connector.destination.width();
		var endY = Math.floor(this.connector.destination.top() + this.connector.destination.height() / 2);

		this.startSegment.startX = startX;
		this.startSegment.startY = startY;
		this.startSegment.orientation = startOrientation;
		this.startSegment.length = this.connector.minSegmentLength + Math.max(0, sign * (startX - endX));
		
		var vLength = endY - startY;
		this.middleSegment.orientation = vLength > 0 ? DOWN : UP;
		this.middleSegment.length = Math.abs(vLength);
		
		this.endSegment.orientation = startOrientation == LEFT ? RIGHT : LEFT;
		this.endSegment.length = Math.max(0, sign * (endX - startX)) + this.connector.minSegmentLength;
	}
}

function VerticalCStrategy(connector, startOrientation)
{
	this.connector = connector;
	
	this.startSegment;
	this.middleSegment;
	this.endSegment;
	
	this.strategyName = "vertical_c";
	
	this.getMiddleSegment = function()
	{
		return this.middleSegment;
	}	
	
	this.isApplicable = function()
	{
		return true;
	}
	
	this.paint = function()
	{
		this.startSegment = connector.createSegment();
		this.middleSegment = connector.createSegment();
		this.endSegment = connector.createSegment();
		
		var sign = 1;
		if(startOrientation == DOWN)
			sign = -1;
		
		var startY = this.connector.source.top();
		if(startOrientation == DOWN)
			startY += this.connector.source.height();
		var startX = Math.floor(this.connector.source.left() + this.connector.source.width() / 2);
		
		var endY = this.connector.destination.top();
		if(startOrientation == DOWN)
			endY += this.connector.destination.height();
		var endX = Math.floor(this.connector.destination.left() + this.connector.destination.width() / 2);
		this.startSegment.startX = startX;
		this.startSegment.startY = startY;
		this.startSegment.orientation = startOrientation;
		this.startSegment.length = this.connector.minSegmentLength + Math.max(0, sign * (startY - endY));
		var hLength = endX - startX;
		this.middleSegment.orientation = hLength > 0 ? RIGHT : LEFT;
		this.middleSegment.length = Math.abs(hLength);
		this.endSegment.orientation = startOrientation == UP ? DOWN : UP;
		this.endSegment.length = Math.max(0, sign * (endY - startY)) + this.connector.minSegmentLength;
	}
}

//strategies[0] = function(connector) {return new VerticalCStrategy(connector)};
strategies[0] = function(connector) {return new VerticalSStrategy(connector)};
strategies[1] = function(connector) {return new HorizontalSStrategy(connector)};
strategies[2] = function(connector) {return new HorizontalLStrategy(connector)};
strategies[3] = function(connector) {return new VerticalLStrategy(connector)};
/*
strategies[4] = function(connector) {return new HorizontalCStrategy(connector, LEFT)};
strategies[5] = function(connector) {return new HorizontalCStrategy(connector, RIGHT)};
strategies[6] = function(connector) {return new VerticalCStrategy(connector, UP)};
strategies[7] = function(connector) {return new VerticalCStrategy(connector, DOWN)};
*/
