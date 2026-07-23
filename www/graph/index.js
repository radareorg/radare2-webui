
window.onresize = function () {
  resizeCanvas ();
}

function resizeBlocks() {
}

function Ajax (method, uri, body, fn) {
  var x = new XMLHttpRequest ();
  x.open (method, uri, false);
  x.onreadystatechange = function (y) {
    if (x.status == 200) {
      if (fn) fn (x.responseText);
    }
  }
  x.send (body);
}

function get_graph() {
  // Clear existing canvas state to prevent conflicts with previous graphs
  canvases = [];
  canvasScrolling = false;
  canvasPanning = false;
  initialBlockPositions = [];
  initialScrollLeft = 0;
  initialScrollTop = 0;

  Ajax ('GET', "/cmd/agfd", '', function (x) {
    try {
      loadGraphFromDot(x);
    } catch (e) {
      console.error('Unable to load radare2 function graph', e);
      document.getElementById('mainCanvas').textContent =
        'Unable to load the function graph. Open the browser console for details.';
    }
  });
}

function onLoad() {
  updateZoomDisplay();
  get_graph();
}

/**
 * Resizes the main canvas to the maximum visible height.
 */
function resizeCanvas() {
  var divElement = document.getElementById("mainCanvas");
  var screenHeight = window.innerHeight || document.body.offsetHeight;
  divElement.style.height = (screenHeight - 16) + "px";
}

/**
 * sets the active menu scanning for a menu item which url is a prefix 
 * of the one of the current page ignoring file extension.
 * Nice trick!
 */
function setMenu() {
  var url = document.location.href;
  // strip extension
  url = stripExtension(url);
  
  var ulElement = document.getElementById("menu");
  var links = ulElement.getElementsByTagName("A");
  var i;
  for(i = 0; i < links.length; i++) {
    if(url.indexOf(stripExtension(links[i].href)) == 0) {
      links[i].className = "active_menu";
      return;
    }
  }
}

/**
 * Strips the file extension and everything after from a url
 */
function stripExtension(url) {
  var lastDotPos = url.lastIndexOf('.');
  return (lastDotPos <= 0)? url:
    url.substring (0, lastDotPos - 1);
}

/**
 * Load graph from DOT format string
 * @param {string} dotData - The DOT format graph data
 */
function loadGraphFromDot(dotData) {
  renderSvgGraph(parseDotFormat(dotData));
  return;

  // Clear existing canvas state to prevent conflicts with previous graphs
  canvases = [];
  canvasScrolling = false;
  canvasPanning = false;
  initialBlockPositions = [];
  initialScrollLeft = 0;
  initialScrollTop = 0;

  var mainCanvas = document.getElementById('mainCanvas');
  var graphData = parseDotFormat(dotData);
  // Fallback: if nothing parsed, show the DOT for debugging rather than blank
  try {
    if ((!graphData.nodes || graphData.nodes.length === 0) && (!graphData.edges || graphData.edges.length === 0)) {
      mainCanvas.innerHTML = '<pre style="padding:10px;">No nodes/edges parsed. Showing input as-is.\n\n' +
        dotData.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</pre>';
      return;
    }
  } catch (e) {}
  createGraphFromDot(graphData, mainCanvas);
  setMenu();
  resizeCanvas();
  try {
    finishGraphLoad();
  } catch (e) {
    console.error('Unable to render DOT graph', e);
    mainCanvas.textContent = 'Unable to render this graph. Open the browser console for details.';
  }
}

function finishGraphLoad() {
  setMenu();
  resizeCanvas();
  initPageObjects();
  resetZoom();
  centerGraph();
}

/**
 * Test function to load a sample DOT graph
 */
function loadTestGraph() {
  var testDot = `digraph CFG {
    entry -> init;
    entry -> check_args;
    init -> main_loop;
    check_args -> main_loop;
    main_loop -> process_item;
    main_loop -> cleanup;
    process_item -> main_loop;
    process_item -> error_handler;
    error_handler -> cleanup;
    cleanup -> exit;
  }`;
  loadGraphFromDot(testDot);
}

/**
 * Test function to load a cyclic graph
 */
function loadCyclicTestGraph() {
  var testDot = `digraph CyclicCFG {
    loop_init -> loop_condition;
    loop_condition -> loop_body;
    loop_condition -> loop_exit;
    loop_body -> increment_counter;
    increment_counter -> loop_condition;
    loop_exit -> final_cleanup;
  }`;
  loadGraphFromDot(testDot);
}

/**
 * Test function to load the sample DOT data from the issue
 */
function loadSampleDotGraph() {
  var testDot = `digraph code {
	graph [fontsize=8 fontname="Courier" bgcolor=azure splines="ortho"];
	node [fillcolor=white style=filled shape=box];
	edge [arrowhead="normal"];
	"0x100000924" [label="60: sym.func.100000924 (int64_t arg1, int64_t arg2);\n- args(x0, x1)\n0x100000924      ldr x9, [x0, 0x60]                                    ; arg1\n0x100000928      ldr x9, [x9, 0x60]\n0x10000092c      ldr x10, [x1, 0x60]                                   ; arg2\n0x100000930      ldr x10, [x10, 0x60]\n0x100000934      cmp x9, x10\n0x100000938      b.le 0x100000944\n"]
	"0x100000944" [label="0x100000944      b.ge 0x100000950\n"]
	"0x100000950" [label="0x100000950      mov x8, x0                                            ; arg1\n0x100000954      add x0, x1, 0x68                                      ; arg2\n0x100000958      add x1, x8, 0x68\n0x10000095c      b sym.imp.strcoll\n"]
	"0x100000948" [label="0x100000948      mov w0, -1\n0x10000094c      ret\n"]
	"0x10000093c" [label="0x10000093c      mov w0, 1\n0x100000940      ret\n"]
        "0x100000924" -> "0x100000944";
        "0x100000924" -> "0x10000093c";
        "0x100000944" -> "0x100000950";
        "0x100000944" -> "0x100000948";
}`;
  loadGraphFromDot(testDot);
}

/**
 * Load DOT data from textarea
 */
function loadFromTextarea() {
  var dotInput = document.getElementById('dotInput');
  var dotData = dotInput.value.trim();
  if (dotData) {
    loadGraphFromDot(dotData);
  } else {
    console.warn('Please enter DOT format data in the textarea');
  }
}

/**
 * Force re-layout of the current graph
 */
function relayoutGraph() {
  if (canvases && canvases.length > 0) {
    var canvas = canvases[0];
    canvas.fitBlocks(); // First resize blocks to fit content
    canvas.alignBlocks(); // Then re-layout the graph

    // Ensure connectors are properly repainted
    for (var i = 0; i < canvas.connectors.length; i++) {
      canvas.connectors[i].repaint();
    }
  } else {
    console.log('No canvas found to re-layout');
  }
}

var svgGraph = null;

function renderSvgGraph(graph) {
  var canvas = document.getElementById('mainCanvas');
  var nodes = graph.nodes || [];
  var edges = graph.edges || [];
  if (!nodes.length) {
    canvas.textContent = 'No graph nodes were returned.';
    return;
  }

  var nodeById = {};
  var indegree = {};
  var outgoing = {};
  for (var i = 0; i < nodes.length; i++) {
    nodeById[nodes[i].id] = nodes[i];
    indegree[nodes[i].id] = 0;
    outgoing[nodes[i].id] = [];
  }
  for (var j = 0; j < edges.length; j++) {
    var edge = edges[j];
    if (nodeById[edge.source] && nodeById[edge.target]) {
      outgoing[edge.source].push(edge.target);
      indegree[edge.target]++;
    }
  }

  // Layer the graph with DFS. A back-edge closes a cycle but does not force
  // every member of that cycle into one final, very wide row.
  var level = {};
  var visitState = {};
  function visit(nodeId) {
    visitState[nodeId] = 1;
    var targets = outgoing[nodeId];
    for (var t = 0; t < targets.length; t++) {
      var target = targets[t];
      if (visitState[target] === 1) continue;
      if (!visitState[target]) {
        level[target] = Math.max(level[target] || 0, level[nodeId] + 1);
        visit(target);
      }
    }
    visitState[nodeId] = 2;
  }
  for (var id in indegree) {
    if (indegree[id] === 0) {
      level[id] = 0;
      visit(id);
    }
  }
  for (var disconnected in nodeById) {
    if (!visitState[disconnected]) {
      level[disconnected] = 0;
      visit(disconnected);
    }
  }
  var deepest = 0;
  for (var known in level) deepest = Math.max(deepest, level[known]);

  var layers = {};
  for (var nodeId in nodeById) {
    var nodeLevel = level[nodeId];
    (layers[nodeLevel] || (layers[nodeLevel] = [])).push(nodeId);
  }
  var positions = {};
  var widest = 1;
  for (var layer in layers) widest = Math.max(widest, layers[layer].length);
  var width = Math.max(900, widest * 270 + 120);
  for (var layerNumber in layers) {
    var layerNodes = layers[layerNumber];
    var startX = Math.max(40, (width - layerNodes.length * 270) / 2);
    for (var n = 0; n < layerNodes.length; n++) {
      positions[layerNodes[n]] = { x: startX + n * 270, y: 70 + Number(layerNumber) * 180 };
    }
  }

  var height = Math.max(650, (deepest + 1) * 180 + 120);
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'cfg-svg');
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.background = '#f5f5f5';
  svg.style.cursor = 'grab';

  var defs = document.createElementNS(ns, 'defs');
  var marker = document.createElementNS(ns, 'marker');
  marker.setAttribute('id', 'cfg-arrow');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '6');
  marker.setAttribute('markerHeight', '6');
  marker.setAttribute('orient', 'auto-start-reverse');
  var arrow = document.createElementNS(ns, 'path');
  arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  arrow.setAttribute('fill', '#4b6b88');
  marker.appendChild(arrow);
  defs.appendChild(marker);
  svg.appendChild(defs);

  for (var e = 0; e < edges.length; e++) {
    var link = edges[e];
    if (!positions[link.source] || !positions[link.target]) continue;
    var from = positions[link.source], to = positions[link.target];
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M ' + (from.x + 105) + ' ' + (from.y + 96) +
      ' C ' + (from.x + 105) + ' ' + (from.y + 132) + ', ' +
      (to.x + 105) + ' ' + (to.y - 36) + ', ' + (to.x + 105) + ' ' + to.y);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#4b6b88');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('marker-end', 'url(#cfg-arrow)');
    svg.appendChild(path);
  }

  for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
    var node = nodes[nodeIndex], point = positions[node.id];
    var group = document.createElementNS(ns, 'g');
    group.setAttribute('transform', 'translate(' + point.x + ',' + point.y + ')');
    var box = document.createElementNS(ns, 'rect');
    box.setAttribute('width', '210');
    box.setAttribute('height', '132');
    box.setAttribute('rx', '6');
    box.setAttribute('fill', '#fff');
    box.setAttribute('stroke', '#456a8c');
    box.setAttribute('stroke-width', '2');
    group.appendChild(box);
    var title = document.createElementNS(ns, 'text');
    title.setAttribute('x', '10');
    title.setAttribute('y', '20');
    title.setAttribute('font-family', 'monospace');
    title.setAttribute('font-size', '12');
    title.setAttribute('font-weight', 'bold');
    title.textContent = node.id;
    group.appendChild(title);
    var lines = String(node.label || node.id).split('\n').slice(0, 8);
    for (var line = 0; line < lines.length; line++) {
      var text = document.createElementNS(ns, 'text');
      text.setAttribute('x', '10');
      text.setAttribute('y', String(40 + line * 11));
      text.setAttribute('font-family', 'monospace');
      text.setAttribute('font-size', '9');
      text.textContent = lines[line].slice(0, 34);
      group.appendChild(text);
    }
    svg.appendChild(group);
  }

  canvas.innerHTML = '';
  canvas.appendChild(svg);
  svgGraph = { svg: svg, width: width, height: height, x: 0, y: 0, zoom: 1 };
  installSvgInteractions(svg);
  updateSvgViewBox();
}

function updateSvgViewBox() {
  if (!svgGraph) return;
  var graph = svgGraph;
  var visibleWidth = graph.width / graph.zoom;
  var visibleHeight = graph.height / graph.zoom;
  graph.svg.setAttribute('viewBox', graph.x + ' ' + graph.y + ' ' + visibleWidth + ' ' + visibleHeight);
  document.getElementById('zoomLevel').textContent = 'Zoom: ' + Math.round(graph.zoom * 100) + '%';
}

function zoomSvgGraph(factor) {
  if (!svgGraph) return;
  svgGraph.zoom = Math.max(0.1, Math.min(24, svgGraph.zoom * factor));
  updateSvgViewBox();
}

function centerSvgGraph() {
  if (!svgGraph) return;
  svgGraph.x = 0;
  svgGraph.y = 0;
  svgGraph.zoom = 1;
  updateSvgViewBox();
}

function installSvgInteractions(svg) {
  var dragging = null;
  svg.addEventListener('pointerdown', function(e) {
    dragging = { x: e.clientX, y: e.clientY, viewX: svgGraph.x, viewY: svgGraph.y };
    svg.setPointerCapture(e.pointerId);
    svg.style.cursor = 'grabbing';
  });
  svg.addEventListener('pointermove', function(e) {
    if (!dragging) return;
    var rect = svg.getBoundingClientRect();
    var scale = (svgGraph.width / svgGraph.zoom) / rect.width;
    svgGraph.x = dragging.viewX - (e.clientX - dragging.x) * scale;
    svgGraph.y = dragging.viewY - (e.clientY - dragging.y) * scale;
    updateSvgViewBox();
  });
  svg.addEventListener('pointerup', function() {
    dragging = null;
    svg.style.cursor = 'grab';
  });
  svg.addEventListener('wheel', function(e) {
    e.preventDefault();
    zoomSvgGraph(e.deltaY < 0 ? 1.2 : 1 / 1.2);
  }, { passive: false });
}

/**
 * Zoom in the graph
 */
function zoomIn() {
  if (svgGraph) {
    zoomSvgGraph(1.5);
    return;
  }
  setZoom(currentZoom + zoomStep);
}

/**
 * Zoom out the graph
 */
function zoomOut() {
  if (svgGraph) {
    zoomSvgGraph(1 / 1.5);
    return;
  }
  setZoom(currentZoom - zoomStep);
}

/**
 * Reset zoom to 100%
 */
function resetZoom() {
  if (svgGraph) {
    centerSvgGraph();
    return;
  }
  setZoom(1.0);
  updateZoomDisplay();
}

/**
 * Center the graph in the viewport by resetting scroll position
 */
function centerGraph() {
  if (svgGraph) {
    centerSvgGraph();
    return;
  }
  if (canvases && canvases.length > 0) {
    var canvas = canvases[0];
    var canvasElement = canvas.htmlElement;

    // Calculate the center of the graph content
    var graphCenterX = canvas.width / 2;
    var graphCenterY = canvas.height / 2;

    // Calculate viewport center
    var viewportWidth = canvasElement.clientWidth;
    var viewportHeight = canvasElement.clientHeight;
    var viewportCenterX = viewportWidth / 2;
    var viewportCenterY = viewportHeight / 2;

    // Scroll to center the graph
    var scrollLeft = graphCenterX - viewportCenterX;
    var scrollTop = graphCenterY - viewportCenterY;

    // Ensure we don't scroll to negative positions (keep graph visible)
    scrollLeft = Math.max(0, scrollLeft);
    scrollTop = Math.max(0, scrollTop);

    canvasElement.scrollLeft = scrollLeft;
    canvasElement.scrollTop = scrollTop;

    console.log('Centered graph at scroll position:', scrollLeft, scrollTop);
  }
}

/**
 * Set zoom level
 */
function setZoom(newZoom) {
  // Clamp zoom level
  newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

  if (Math.abs(newZoom - currentZoom) < 0.01) return; // No significant change

  var oldZoom = currentZoom;
  currentZoom = newZoom;
  var zoomRatio = currentZoom / oldZoom;

  // Scale all blocks proportionally, centered on viewport center
  if (canvases && canvases.length > 0) {
    var canvas = canvases[0];
    var canvasElement = canvas.htmlElement;

    // Calculate viewport center in world coordinates
    var viewportCenterX = canvasElement.scrollLeft + canvasElement.clientWidth / 2;
    var viewportCenterY = canvasElement.scrollTop + canvasElement.clientHeight / 2;

    // Scale all blocks relative to the viewport center
    for (var i = 0; i < canvas.blocks.length; i++) {
      var block = canvas.blocks[i];
      scaleBlockRelativeToPoint(block, zoomRatio, viewportCenterX, viewportCenterY);
    }

    // Update canvas dimensions
    canvas.width *= zoomRatio;
    canvas.height *= zoomRatio;
    canvas.innerDiv.style.width = canvas.width + 'px';
    canvas.innerDiv.style.height = canvas.height + 'px';

    // Adjust scroll position to keep viewport center fixed
    var newScrollLeft = viewportCenterX * zoomRatio - canvasElement.clientWidth / 2;
    var newScrollTop = viewportCenterY * zoomRatio - canvasElement.clientHeight / 2;

    canvasElement.scrollLeft = Math.max(0, newScrollLeft);
    canvasElement.scrollTop = Math.max(0, newScrollTop);

    // Repaint all connectors
    for (var j = 0; j < canvas.connectors.length; j++) {
      canvas.connectors[j].repaint();
    }
  }

  // Update zoom level display
  updateZoomDisplay();
}

/**
 * Scale a block by the given ratio
 */
function scaleBlock(block, ratio) {
  // Scale dimensions
  var currentWidth = parseFloat(block.htmlElement.style.width) || block.htmlElement.offsetWidth;
  var currentHeight = parseFloat(block.htmlElement.style.height) || block.htmlElement.offsetHeight;

  var newWidth = currentWidth * ratio;
  var newHeight = currentHeight * ratio;

  // Update element styles
  block.htmlElement.style.width = newWidth + 'px';
  block.htmlElement.style.height = newHeight + 'px';

  // Scale font size
  var currentFontSize = parseFloat(getStyle(block.htmlElement, 'font-size')) || 11;
  block.htmlElement.style.fontSize = (currentFontSize * ratio) + 'px';

  // Scale position to maintain relative positioning
  var currentLeft = parseFloat(block.htmlElement.style.left) || block.htmlElement.offsetLeft;
  var currentTop = parseFloat(block.htmlElement.style.top) || block.htmlElement.offsetTop;

  var newLeft = currentLeft * ratio;
  var newTop = currentTop * ratio;

  block.htmlElement.style.left = newLeft + 'px';
  block.htmlElement.style.top = newTop + 'px';

  // Update block's internal position tracking
  block.currentLeft = newLeft;
  block.currentTop = newTop;
}

/**
 * Scale a block by the given ratio relative to a specific point
 */
function scaleBlockRelativeToPoint(block, ratio, centerX, centerY) {
  // Scale dimensions
  var currentWidth = parseFloat(block.htmlElement.style.width) || block.htmlElement.offsetWidth;
  var currentHeight = parseFloat(block.htmlElement.style.height) || block.htmlElement.offsetHeight;

  var newWidth = currentWidth * ratio;
  var newHeight = currentHeight * ratio;

  // Update element styles
  block.htmlElement.style.width = newWidth + 'px';
  block.htmlElement.style.height = newHeight + 'px';

  // Scale font size
  var currentFontSize = parseFloat(getStyle(block.htmlElement, 'font-size')) || 11;
  block.htmlElement.style.fontSize = (currentFontSize * ratio) + 'px';

  // Get current position
  var currentLeft = parseFloat(block.htmlElement.style.left) || block.htmlElement.offsetLeft;
  var currentTop = parseFloat(block.htmlElement.style.top) || block.htmlElement.offsetTop;

  // Calculate new position relative to the center point
  var newLeft = centerX + (currentLeft - centerX) * ratio;
  var newTop = centerY + (currentTop - centerY) * ratio;

  block.htmlElement.style.left = newLeft + 'px';
  block.htmlElement.style.top = newTop + 'px';

  // Update block's internal position tracking
  block.currentLeft = newLeft;
  block.currentTop = newTop;
}

/**
 * Update the zoom level display
 */
function updateZoomDisplay() {
  var zoomElement = document.getElementById('zoomLevel');
  if (zoomElement) {
    zoomElement.textContent = 'Zoom: ' + Math.round(currentZoom * 100) + '%';
  }
}

/**
 * Force re-layout of the current graph
 */
function relayoutGraph() {
  if (svgGraph) {
    centerSvgGraph();
    return;
  }
  if (canvases && canvases.length > 0) {
    canvases[0].fitBlocks(); // First resize blocks to fit content
    canvases[0].alignBlocks(); // Then re-layout the graph
    console.log('Graph re-layout completed');
  } else {
    console.log('No canvas found to re-layout');
  }
}
