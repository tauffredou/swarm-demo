function Graph(el) {

    var engines = [];
    var w = $(el).innerWidth();
    var h = $(el).innerHeight();

    var color = d3.scale.category20().domain(engines);

    // Add and remove elements on the graph object
    this.addNode = function (event) {
        var node = findNode(event.Id);
        if (node != null) {
            node.data = event
        } else {
            nodes.push({"id": event.Id, "data": event, 'type': 'container'});
        }
        update();
    };

    this.removeNode = function (id) {
        console.log("Remove " + id);
        var i = 0;
        var n = findNode(id);
        var index = findNodeIndex(id);
        if (index !== undefined) {
            nodes.splice(index, 1);
            update();
        }
    };

    var indexOf = function (stack, needle) {
        for (i = 0; i < stack.length; i++) {
            if (stack[i] === needle) {
                return i
            }
        }
        return -1
    };

    var nodeColor = function (d) {
        if ((index = indexOf(engines, d.data.Node)) != -1) {
            return color(index)
        }
        return color(0);
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

    var vis = d3.select(el).append("svg:svg")
        .attr("width", w)
        .attr("height", h);

    var force = d3.layout.force()
        .gravity(0.3)
        .charge(-400)
        .distance(20)
        .size([w, h]);

    var nodes = force.nodes();
    var links = force.links();

    var update = function () {

        function tick() {
            node
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
        }

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

        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .call(force.drag);

        nodeEnter.append('circle')
            .attr('r', 20)
            .style("stroke", nodeColor)
            .style("fill", function (d) {
                console.log(d.data.Running)
                return d.data.Running ? "#1EC200" : "red"
            })
            .style("stroke-width", 14);

        force.on("tick", tick);

        nodeEnter.append("text")
            .attr("class", "nodetext")
            .attr("dx", 25)
            .attr("dy", ".35em")
            .text(function (d) {
                if (d.type == 'container') {
                    return d.data.Name
                }
                return d.id
            });

        node.exit().remove();

        // Restart the force layout.
        force.start();
    };

    update();
}