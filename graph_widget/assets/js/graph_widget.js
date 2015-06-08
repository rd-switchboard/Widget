/**
 * Graph Widget
 *
 * @Create by Dima Kudravcev (dmitrij@kudriavcev.info)
 * @Version 3.0 - 2015-06-01
 */


/**
 * Extens d3.selection prototipe with moveToFront function
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
        this.parentNode.appendChild(this);
    });
};

/**
 * Add graph property to d3
 */
d3.graph = function() {
    /**
     * protected variables
     */

    var vis = null,
	svg = null,
	point = null,
	node = null,
	target = null,
	width = getWidth,
	height = getHeight,
	force = null,
	drag = null,
	gnodes = null,
	glinks = null,
	nodes = null, 
	links = null
	charge = -1e3,
	linkDistance = 80,
	radius = 24,
	legend = new Set()
	imgPath = "/applications/apps/graph_widget/assets/images/";
	

    /**
      * object constructor
      */	
    function graph(container) {
	vis = container;

	var w = width(), 
	    h = height();

	svg = vis.append("svg")
	    .attr("width", w)
	    .attr("height", h);

	svg.append("defs")
	    .selectAll("marker")
    	    .data(["suit"]).enter()
	    	.append("marker")
	    	    .attr("id", function(d) { return d; })
	    	    .attr("viewBox", "0 -5 10 10")
	    	    .attr("refX", 25)
	    	    .attr("refY", 0)
	    	    .attr("markerWidth", 5)
	    	    .attr("markerHeight", 5)
	    	    .attr("orient", "auto")
	    	.append("path")
	    	    .attr("d", "M0,-5L10,0L0,5Z")
		    .style("fill", "#a3be99")
	    	    .style("stroke", "#a3be99");
//	    	    .style("opacity", "0.6");

	point = svg.node().createSVGPoint()

	node = initNode();
    	document.body.appendChild(node)

	force = d3.layout.force() 
            .size([w, h])
            .charge(charge) 
            .linkDistance(linkDistance);

	drag = force.drag()
            .on("dragstart", function(d) {
		d.fixed = true;
	    })
            .on("drag", function(d) {
		d.px = validate(d.px, 0, w);
		d.py = validate(d.py, 0, h);
	    })/*	
            .on("dragend", function(d) {
		if (d.x < 16 || d.x > w-16 || d.y < 16 || d.y > h-16)
		    d.fixed = false;
	    })*/;
    }

    /**
     * Public methods
     */

   /**
     * Return or set width of the svg element
     */
    graph.width = function(v) {
	if (!arguments.length) return width
	width = v == null ? getWidth : d3.functor(v)

	return graph;
    };
    
   /**
     * Return or set height of the svg element
     */
    graph.height = function() {
	if (!arguments.length) return height
	height = v == null ? getHeight : d3.functor(v)

	return graph;
    };

    /*
     * load JSON into widget
     */
    graph.load = function(json) {
	var map = {}, from, to, root = null, w = width(), h = height();

	// reset graph array	
    	nodes = json.nodes;
    	links = json.relationships;	

    	// collect all nodes
    	for (var i=0;i<nodes.length;++i) {
	    var node = json.nodes[i];
	    node.collapsed = false;
	    node.hidden = false;
	    node.more = false;
	    node.selected = false;
	    node.links = {};

   	    if (indexOf(node.extras, 'root') !== -1)
                root = node;    

	    map[node.id] = node;
    	} 

        // set the root node to the graph centre
        if (null != root) {
            root.fixed = true;
	    root.x = w/2;
	    root.y = h/2;
        } 

        // alert(root);

    	circularLayout(nodes, { x: w/2, y: h/2 }, nodes.length * linkDistance / (2 * Math.PI));

    	// attach all relationships	
    	for (var i=0;i<links.length;++i) {
	    var link = links[i];

	    from = map[link.from];
	    to = map[link.to];

	    link.source=from;
	    link.target=to;

	    from.links[to.id] = to;
	    to.links[from.id] = from;
    	}

	return graph;
    };

    graph.update = function() {
	var _nodes = [], _links = [];

        for (var i=0;i<nodes.length;++i)
	    if (!nodes[i].hidden) {
	        _nodes.push(nodes[i]);
		
		if (!legend.has(nodes[i].type)) {
		    addLegend(legend.size, getName(nodes[i]), getColor(nodes[i]), getStrokeColor(nodes[i]), getImage(nodes[i]));
		    legend.add(nodes[i].type);
                }
            }

        for (var i=0;i<links.length;++i) 
	    if (!links[i].source.hidden && !links[i].target.hidden)
	        _links.push(links[i]);

        force
           .nodes(_nodes)
           .links(_links)
           .start();

        // Update the links…
        glinks = svg.selectAll("line.graph-link")
            .data(_links);

    	// Enter any new links.
	glinks.enter().append("line")
            .attr("class", "graph-link")
	    .style("marker-end",  "url(#suit)")
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        // Exit any old links.
        glinks.exit().remove();


       // Update the nodes…
        gnodes = svg.selectAll("g.graph-node")
            .data(_nodes, function(d) { return d.id; });
  
        var newNodes = gnodes.enter().append("g")
            .attr("class", "graph-node")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; }) 
            .call(drag)
   	    .on('mouseover', showProperties)
            .on('mouseout', hideProperties)
            .on("dblclick", collapse); 
    
        newNodes.append("circle")
	    .attr("cx", 0)
	    .attr("cy", 0);
            
        newNodes.append("image")
            .attr("xlink:href", getImage)
            .attr("x", -radius/2)
            .attr("y", -radius/2)
            .attr("width", radius + "px")
            .attr("height", radius + "px"); 	
  
        // Exit any old nodes.
        gnodes.exit().remove();

        gnodes.selectAll("circle")
	    .attr("r", getRadius)
	    .attr("fill", getColor)
	    .attr("stroke", getStrokeColor);

        force.on("tick", tick);

	return graph;
    };

    /**
     * Private methods
     */

    function showProperties() {
	var target, args = Array.prototype.slice.call(arguments);
    	if(args[args.length - 1] instanceof SVGElement) 
	    target = args.pop();
	else
	    target = d3.event.target;
    
	args[0].selected = true;
    
	d3.select(this).select('circle').attr("r", getRadius);

	var content = getPropertiesHtml.apply(this, args),
	    nodel = d3.select(node);

	nodel.html(content);

   	var matrix = target.getScreenCTM(),
	    tbbox = target.getBBox(),
	    scrollTop  = document.documentElement.scrollTop || document.body.scrollTop,
            scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft


	point.x = tbbox.x + scrollLeft;
        point.y = tbbox.y + scrollTop;

        var pt = point.matrixTransform(matrix),
	    top = pt.y - node.offsetHeight/2,
	    left = pt.x - node.offsetWidth;
  
        nodel.style({ opacity: 1, 'pointer-events': 'all', top: top + 'px', left: left + 'px'});
    }

    function hideProperties() {
	var args = Array.prototype.slice.call(arguments);

	args[0].selected = false;

	d3.select(this).select('circle').attr("r", getRadius);
        d3.select(node).style({ opacity: 0, 'pointer-events': 'none' })
    }

    function collapse(d) {
	if (d3.event.defaultPrevented) return;

	d.collapsed = !d.collapsed;
//	alert(d.collapsed);
	
	d.more = false; 
	for (n1 in d.links) {
	    d.links[n1].hidden = d.collapsed;
	}
	
	if (d.collapsed) {
	    var n, hidden;
	    for (n1 in d.links) {
	        hidden = true; 
	    	n = d.links[n1];
	        for (n2 in n.links) {
		    if (!n.links[n2].hidden && !n.links[n2].collapsed) {
		        hidden = false;
		        break;
                    }			
                } 
	
                n.hidden = hidden;
	        if (hidden && !d.more)
		    d.more = true;	    		
            } 
        }
        
    //    alert("more:" +d.more);

	graph.update();
        gnodes.moveToFront();
    }

    /*
     * return width of attached svg object
     */ 	
    function getWidth() { return parseInt(vis.style("width")); }	

    /* 
     * return height of attached svg object
     */
    function getHeight() { return parseInt(vis.style("height")); }	


    /**
     * extracts SVG Node from the given element
     *   
     * @param el Node element
     */
    /*function getSVGNode(el) {
        el = el.node();
        if(el.tagName.toLowerCase() == 'svg')
            return el;

        return el.ownerSVGElement;
    }*/

    /**
     * patched indexOf to work in IE 8 and below
     */
    function indexOf(array, needle) {
        if (typeof array !== 'undefined' && array.constructor === Array) {	
            if(typeof Array.prototype.indexOf === 'function') 
	        return array.indexOf(needle);
    
            for(var i=0;i<array.length;++i) 
                if(array[i] === needle) 
                    return i;
        }
    
        return -1;
    }

    /**
     * Initial circular layout
     */
    function circularLayout(nodes, center, radius) {
        var n, _nodes = nodes.filter(function(d) { return !(null != d.x && null != d.y); }); 
 
        for (var i=0;i<_nodes.length;++i) {
	    n = _nodes[i];

            n.x = center.x + radius * Math.sin(2 * Math.PI * i / _nodes.length);
	    n.y = center.y + radius * Math.cos(2 * Math.PI * i / _nodes.length);
        }
    }

    /**
     * validate the variable
     */

    function validate(x, a, b) {
        if (x < a) x = a;
        if (x > b) x = b;
        return x;
    }

    function tick(d) {
	//alert("tick");

        glinks.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

//	gnodes.attr("cx", function (d) { return d.x; })
//	    .attr("cy", function (d) { return d.y; });

        gnodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    }



/*node.attr("cx", function (d) {
        return d.x;
    })
        .attr("cy", function (d) {
        return d.y;
    });*/


    function getRadius(d) {
        return d.selected || d.more ? radius * 1.5 : radius; // (d.collapsed && typeof(d.children)!=='undefined') ? 24 : 16;	
    }

    // Color leaf nodes orange, and packages white or blue.
    function getName(d) {
	if (d.type==='researcher')
	    return "Researcher";
        if (d.type==='grant') 
            return "Grant";
        if (d.type==='publication')
            return "Publication";
        if (d.type==='dataset')
            return "Dataset";
        if (d.type==='institution')
      	    return "Institution";
	return '';	
    }
  	

    function getColor(d) {
	
	if (d.type==='researcher')
	    return "#6ecf9c";
        if (d.type==='grant') 
            return "#fcd57a";
        if (d.type==='publication')
            return "#7ed4fe";
        if (d.type==='dataset')
            return "#fa7d79";
        if (d.type==='institution')
      	    return "#545544";

	return "black";
    }

    function getStrokeColor(d) {
        if (d.type==='researcher')
	    return "#64c592";
        if (d.type==='grant') 
            return "#f2cb70";
        if (d.type==='publication')
            return "#74CAF4";
        if (d.type==='dataset')
            return "#F0736F";
        if (d.type==='institution')
	    return "#4A4B3A";
         
	return "black";
    }

    function getImage(d) {
        if (d.type==='researcher') 
	    return imgPath + "researcher.png";
        if (d.type==='grant')
	    return imgPath + "grant.png";
        if (d.type==='publication')
	    return imgPath + "publication.png";
        if (d.type==='dataset')
	    return imgPath + "dataset.png";
        if (d.type==='institution')
	    return imgPath + "institution.png";

	return ''; 
    }

    function addLegend(index, text, color, strokeColor, image) {
	var legend = svg.append("g")
	    .attr("class", "graph-legend")
	    .attr("transform", "translate(" + (radius + 5) + "," + (radius * (index * 2.5 + 1) + 5) + ")");	
			
	legend.append("circle")
	    .attr("cx", 0)
	    .attr("cy", 0)
	    .attr("r", radius)
    	    .attr("fill", color)
	    .attr("stroke", strokeColor);	
            
        legend.append("image")
            .attr("xlink:href", image)
            .attr("x", -radius/2)
            .attr("y", -radius/2)
            .attr("width", radius + "px")
            .attr("height", radius + "px"); 	

	legend.append("text")
	    .text(text)
	    .attr("x", radius*1.2)
	    .attr("y", radius/2);
    }

    function initNode() {
       var node = d3.select(document.createElement('div'))
       node.style({
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          boxSizing: 'border-box'
       })
	    .attr('class', 'graph-tip')	

       return node.node()
    }

    function getPropertiesHtml(d) {
        var html = "<ul class='tip-content'><li class='tip-header'><div class='tip-type'>" + d.properties.node_type + ", " + d.properties.node_source + " </div><div class='tip-id'>[" + d.id + "]</div></li>";
  
/*	html += "<li class='tip-line'><div class='tip-key'>collapsed</div><div class='tip-value'>" + d.collapsed + "</div></li>";
        html += "<li class='tip-line'><div class='tip-key'>hidden</div><div class='tip-value'>" + d.hidden + "</div></li>";
        html += "<li class='tip-line'><div class='tip-key'>more</div><div class='tip-value'>" + d.more + "</div></li>";*/
        
        for(var p in d.properties) {
	    html += "<li class='tip-line'><div class='tip-key'>" + p + "</div><div class='tip-value'>" + d.properties[p] + "</div></li>";
        }
	 
        return html + "</ul>"; 
    }

    return graph;
};


$(document).ready(function() {
//	alert("ready");

    var graph = d3.graph();
    d3.select(".graph").call(graph);	

    var parser = document.createElement('a');
   
    parser.href = window.location.href;
   
    var path = parser.pathname.split("/");
    if (path.length >= 3) {
        var jsonName = "http://ec2-52-25-66-82.us-west-2.compute.amazonaws.com/rda/" + path[1] + "-" + path[2] + ".json";	
	d3.json(jsonName, function(error, json) {
	   if (null == error) 
   	        graph.load(json).update();

	});
    }
});

