function Graph(el) {

    var engines = [];
    var w = $(el).innerWidth();
    var h = $(el).innerHeight();

    var color = d3.scale.category20().domain(engines);

    // Add and remove elements on the graph object
    this.addNode = function (id, status, data) {
        nodes.push({"id": id, "status": status, "data": data, 'type': 'container', engine: data.engine});
        update();
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

    this.addEngine = function (name) {
        if (indexOf(engines, name) == -1) {
            engines.push(name)
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
        if ((index = indexOf(engines, d.data.engine)) != -1) {
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
        .gravity(0.5)
        .charge(-300)
        .distance(60)
        .linkDistance(250)
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
            .classed(function (d) {
                d.type
            })
            .call(force.drag);

        nodeEnter.append('circle')
            .attr('r', 8)
            .classed("running", function (d) {
                return d.Status
            }).style("fill", nodeColor);

        force.on("tick", tick);

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

        // Restart the force layout.
        force.start();
    };

    update();
}