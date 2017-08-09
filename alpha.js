var margin = {
		top: 30,
		right: 10,
		bottom: 10,
		left: 10
	},
	width = 2500 - margin.left - margin.right,
	height = 2000 - margin.top - margin.bottom;

var x = d3.scale.ordinal().rangePoints([0, width], 1),
	y = {},
	dragging = {};

var line = d3.svg.line(),
	axis = d3.svg.axis().orient("left"),
	background,
	foreground;

var svg = d3.select("body").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var dropcountry = d3.select('#dropcountry'),
	dropregion = d3.select('#dropregion'),
	selCount = {};

var regions = {},
	countries = {};

d3.csv("stackbars.csv", function (error, world) {

	regions = d3.nest().key(function (d) {
		return d.Region;
	}).entries(world);

	countries = d3.nest().key(function (d) {
		return d.Country;
	}).entries(world);

	regions = regions.sort(function (a, b) {
		if (a.key < b.key) return -1;
		if (a.key > b.key) return 1;
		return 0;
	})

	dropregion.selectAll('option')
		.data(regions)
		.enter()
		.append("option")
		.attr("value", function (d) {
			return d.key;
		})
		.text(function (d) {
			return d.key;
		});

	dropcountry.selectAll('option')
		.data(countries)
		.enter()
		.append("option")
		.attr("value", function (d) {
			return d.key;
		})
		.text(function (d) {
			return d.key;
		});

	dropregion.on('change', function () {

		var selected = this.value;

		selCount = world.filter(function (d) {
			return d['Region'] == selected;
		})

		selCount = d3.nest().key(function (d) {
			return d.Country;
		}).entries(selCount);

		console.log(selCount);

		dropcountry.selectAll('option').remove();

		dropcountry.selectAll('option')
			.data(selCount)
			.enter()
			.append('option')
			.attr('value', function (d) {
				return d.key;
			})
			.text(function (d) {
				return d.key;
			})
	})
})

d3.csv("parcoords.csv", function (error, world) {
	x.domain(dimensions = d3.keys(world[0]).filter(function (d) {

		if (d === "Beverage_Types" || d === "Region") {
			return false;
		} else if (d === "Country") {
			y[d] = d3.scale.ordinal()
				.domain(world.map(function (p) {
					return p[d];
				}))
				.rangePoints([height, 0]);
		} else {
			y[d] = d3.scale.linear()
				.domain(d3.extent(world, function (p) {
					return +p[d];
				}))
				.range([height, 0]);
		}
		return true;
	}));

	world = world.filter(function (d) {
		return d.Beverage_Types == "All types";
	})

	// Add grey background lines for context.
	background = svg.append("g")
		.attr("class", "background")
		.selectAll("path")
		.data(world)
		.enter().append("path")
		.attr("d", path);

	// Add blue foreground lines for focus.
	foreground = svg.append("g")
		.attr("class", "foreground")
		.selectAll("path")
		.data(world)
		.enter().append("path")
		.attr("d", path)

	//add hover action: create country label on left side of vis	

	// Add a group element for each dimension.
	var g = svg.selectAll(".dimension")
		.data(dimensions)
		.enter().append("g")
		.attr("class", "dimension")
		.attr("transform", function (d) {
			return "translate(" + x(d) + ")";
		})
		.call(d3.behavior.drag()
			.origin(function (d) {
				return {
					x: x(d)
				};
			})
			.on("dragstart", function (d) {
				dragging[d] = x(d);
				background.attr("visibility", "hidden");
			})
			.on("drag", function (d) {
				dragging[d] = Math.min(width, Math.max(0, d3.event.x));
				foreground.attr("d", path);
				dimensions.sort(function (a, b) {
					return position(a) - position(b);
				});
				x.domain(dimensions);
				g.attr("transform", function (d) {
					return "translate(" + position(d) + ")";
				})
			})
			.on("dragend", function (d) {
				delete dragging[d];
				transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
				transition(foreground).attr("d", path);
				background
					.attr("d", path)
					.transition()
					.delay(500)
					.duration(0)
					.attr("visibility", null);
			}));

	// Add an axis and title.
	g.append("g")
		.attr("class", "axis")
		.each(function (d) {
			d3.select(this).call(axis.scale(y[d])
				.outerTickSize(5));
		})
		.append("text")
		.style("text-anchor", "middle")
		.attr("y", -9)
		.text(function (d) {
			return d;
		});

	// Add and store a brush for each axis.
	g.append("g")
		.attr("class", "brush")
		.each(function (d) {
			d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d])
				.on("brushstart", brushstart)
				.on("brush", brush));
		})
		.selectAll("rect")
		.attr("x", -8)
		.attr("width", 16);
});

function position(d) {
	var v = dragging[d];
	return v == null ? x(d) : v;
}

function transition(g) {
	return g.transition().duration(500);
}

// Returns the path for a given data point.
function path(d) {
	return line(dimensions.map(function (p) {
		return [position(p), y[p](d[p])];
	}));
}

function brushstart() {
	d3.event.sourceEvent.stopPropagation();
}

// Handles a brush event, toggling the display of foreground lines.
function brush() {
	var actives = dimensions.filter(function (p) {
			return !y[p].brush.empty();
		}),
		extents = actives.map(function (p) {
			return y[p].brush.extent();
		});
	foreground.style("display", function (d) {
		return actives.every(function (p, i) {
			return extents[i][0] <= d[p] && d[p] <= extents[i][1];
		}) ? null : "none";
	});
}
