var charts = (function () {
  function makeChart (set) {
    var data = set.avgData;
    // for (var i = 0; i < data.length; i++) {
    //   console.log(JSON.stringify(data[i]));
    // }
    data.columns = ['index', 'price', 'balance', 'avg'];
    var svg = d3.select("svg");
    var margin = {top: 20, right: 80, bottom: 30, left: 50};
    var width = svg.attr("width") - margin.left - margin.right;
    var height = svg.attr("height") - margin.top - margin.bottom;
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);
    var z = d3.scaleOrdinal(d3.schemeCategory10);

    var line = d3.line()
      // .curve(d3.curveBasis)
      .x(function(d) { return x(d.index); })
      .y(function(d) { return y(d.price); });

      var priceTypes = data.columns.slice(1).map(function(col_name) {
        return {
          id: col_name,
          values: data.map(function(d) {
            return {index: d.index, price: d[col_name] || 0};
          })
        };
      });

      x.domain(d3.extent(data, function(d) { return d.index; }));

      y.domain([
        d3.min(priceTypes, function(c) { return d3.min(c.values, function(d) { return d.price || 0; }); }),
        d3.max(priceTypes, function(c) { return d3.max(c.values, function(d) { return d.price || 0; }); })
      ]);
      z.domain(priceTypes.map(function(c) { return c.id; }));
      g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
      g.append("g")
          .attr("class", "axis axis--y")
          .call(d3.axisLeft(y))
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", "0.71em")
          .attr("fill", "#000")
          .text("$");
      var eachLine = g.selectAll(".eachLine")
        .data(priceTypes)
        .enter().append("g")
          .attr("class", "eachLine");
      eachLine.append("path")
          .attr("class", "line")
          .attr("d", function(d) { 
            return line(d.values); })
          .style("stroke", function(d) { 
            return z(d.id); });
      eachLine.append("text")
          .datum(function(d) { return {id: d.id, value: d.values[d.values.length - 1]}; })
          .attr("transform", function(d) { 
            return "translate(" + x(d.value.index) + "," + y(d.value.price) + ")"; })
          .attr("x", 3)
          .attr("dy", "0.35em")
          .style("font", "10px sans-serif")
          .text(function(d) { return d.id; });

    function type(d, _, columns) {
      d.index = d.index;
      for (var i = 1, n = columns.length, c; i < n; ++i) d[c = columns[i]] = +d[c];
      return d;
    }
  }
  return {
    makeChart: makeChart,
  }
}()); // end charts