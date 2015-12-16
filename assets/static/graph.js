function Graph(el) {

    var rootNode = "swarm";
    // Add and remove elements on the graph object
    this.addNode = function (id, status, data) {
        nodes.push({"id": id, "status": status, "data": data, 'type': 'container'});
        update();
    };

    this.addRoot = function () {
        nodes.push({"id": rootNode, "type": 'swarm'});
    };

    this.removeNode = function (id) {
        var i = 0;
        var n = findNode(id);
        while (i < links.length) {
            if ((links[i]['source'] === n) || (links[i]['target'] == n)) links.splice(i, 1);
            else i++;
        }
        var index = findNodeIndex(id);
        if (index !== undefined) {
            nodes.splice(index, 1);
            update();
        }
    };

    this.addLink = function (sourceId, targetId) {
        var sourceNode = findNode(sourceId);
        var targetNode = findNode(targetId);

        if ((sourceNode !== undefined) && (targetNode !== undefined)) {
            links.push({"source": sourceNode, "target": targetNode});
            update();
        }
    };

    this.addEngine = function (name, ip) {
        nodes.push({id: name, addr: ip, type: 'engine'});
        this.addLink(rootNode, name);
        update();
    };

    var findNode = function (id) {
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id)
                return nodes[i]
        }
    };

    var findNodeIndex = function (id) {
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id)
                return i
        }
    };

    var w = $(el).innerWidth();
    var h = $(el).innerHeight();

    var vis = this.vis = d3.select(el).append("svg:svg")
        .attr("width", w)
        .attr("height", h);

    var force = d3.layout.force()
        .gravity(.02)
        .charge(0)
//                .distance(100)
        .linkDistance(250)
        .size([w, h]);

    var nodes = force.nodes();
    var links = force.links();

    var update = function () {

        var link = vis.selectAll("line.link")
            .data(links, function (d) {
                return d.source.id + "-" + d.target.id;
            });

        link.enter().insert("line")
            .attr("class", "link");

        link.exit().remove();

        var node = vis.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id;
            });

        node.transition()
            .duration(750)
            .delay(function (d, i) {
                return i * 5;
            })
            .attrTween("r", function (d) {
                var i = d3.interpolate(0, d.radius);
                return function (t) {
                    return d.radius = i(t);
                };
            });

        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .classed(function (d) {
                d.type
            })
//                    .on("mouseover", mouseover)
//                    .on("mouseout", mouseout)
            .call(force.drag);

        nodeEnter.append(function (d) {
            var element;
            switch (d.type) {
                case 'engine':
                    element = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                    element.setAttribute('r', 50);
                    element.classList.add("engine");
                    break;
                case 'swarm':
                    element = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                    element.setAttribute('r', 10);
                    break;
                default:
                    element = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                    element.setAttribute('r', 20);
                    element.classList.add("container");
                    break

            }
            element.classList.add(d.type);
            return element;
        }).classed("running", function (d) {
            return d.Status
        });


//            nodeEnter.append("image")
//                    .attr("class", "circle")
//                    .attr("xlink:href", "https://d3nwyuy0nl342s.cloudfront.net/images/icons/public.png")
//                    .attr("x", "-8px")
//                    .attr("y", "-8px")
//                    .attr("width", "16px")
//                    .attr("height", "16px");

        nodeEnter.append("text")
            .attr("class", "nodetext")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(function (d) {
                if (d.type == 'container') {
                    return d.data.Name
                }
                return d.id
            });

        node.exit().remove();

        force.on("tick", function () {
            link.attr("x1", function (d) {
                return d.source.x;
            })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                });

            node.each(cluster(10 * e.alpha * e.alpha))
                .each(collide(.5))
                .attr("cx", function (d) {
                    return d.x;
                })
                .attr("cy", function (d) {
                    return d.y;
                });
        });

        // Move d to be adjacent to the cluster node.
        function cluster(alpha) {
            return function (d) {
                var cluster = clusters[d.cluster];
                if (cluster === d) return;
                var x = d.x - cluster.x,
                    y = d.y - cluster.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + cluster.radius;
                if (l != r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    cluster.x += x;
                    cluster.y += y;
                }
            };
        }

        // Resolves collisions between d and all other circles.
        function collide(alpha) {
            var quadtree = d3.geom.quadtree(nodes);
            return function (d) {
                var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
                    nx1 = d.x - r,
                    nx2 = d.x + r,
                    ny1 = d.y - r,
                    ny2 = d.y + r;
                quadtree.visit(function (quad, x1, y1, x2, y2) {
                    if (quad.point && (quad.point !== d)) {
                        var x = d.x - quad.point.x,
                            y = d.y - quad.point.y,
                            l = Math.sqrt(x * x + y * y),
                            r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
                        if (l < r) {
                            l = (l - r) / l * alpha;
                            d.x -= x *= l;
                            d.y -= y *= l;
                            quad.point.x += x;
                            quad.point.y += y;
                        }
                    }
                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                });
            };
        }

        // Restart the force layout.
        force.start();
    };

//        function mouseover() {
//            d3.select(this).select("circle").transition()
//                    .duration(750)
//                    .attr("r", 30);
//        }
//
//        function mouseout() {
//            d3.select(this).select("circle").transition()
//                    .duration(750)
//                    .attr("r", 20);
//        }

    // Make it all go
    this.addRoot();
    update();
}