/**
 * Generate price change data sets to test algorithms against
 */
var trader = (function () {
  // hold the info for the data set
  var set;

  function getData (event) {
    event.preventDefault();
    // store any existing data in case the user chose to reuse it
    var existingData; 
    if (set) {
      existingData = set.data;
    }
    /**
     * Gather the set of user selections to use to generate charts
     * 
     * maxChange #, maximum price dollar change between two times
     * qty #, number of price changes to create
     * increaseLevel #, price shifts up if a random number between 0 and 1 is above this number.
     */
    set = {
      maxChange: $('#trader-max-change-input').val(),
      qty: $('#trader-price-changes-input').val(),
      increaseLevel: .5,
      min: 0,
      dollars: 1000,
      avgType: $('#trader-avg-select').val(),
      smoothing: $('#trader-smoothing-input').val(),
      txsToAvg: $('#trader-avg-count-input').val(),
      actionChange: $('#trader-action-change-input').val(),
      reuseData: $('#trader-reuse-checkbox').prop('checked'),
    }
    // delete the existing chart
    $('svg').empty();
    // if there is not already data or we are not reusing existing data, make new price data
    if (!existingData || (existingData && !set.reuseData)) {
      generate();
    } else {
      // if we are reusing existing data, don't generate new data
      set.data = existingData;
    }
    // run the data through the buy sell algorithm
    run();
    // display the data in a chart
    charts.makeChart(set);
  }

  function generate () {
    // place to store data
    set.data = [];
    // starting price
    var lastPrice = 1000;
    // add first price
    set.data.push(lastPrice);
    // generate price data for as many price points as set by the user
    for (var i = 0; i < set.qty; i++) {
      // rand is a random number to decide how much the price should change
      var rand = Math.random();
      // changeType is whether to move the price up or down by the price change amount
      var changeType = 'down';
      // increase if above increase threshhold or price near 0
      if (rand > set.increaseLevel) {
        changeType = 'up';
      } else if (lastPrice - change < 0) {
        changeType = 'up';
      }
      // number to calculate change in price
      rand = Math.random();
      // amount of price change is the random number between 0 and 1 and the maximum allowed change per price point
      var change = rand * set.maxChange;
      // make new price
      if (changeType === 'up') {
        // add the change to make the price go up
        lastPrice += change;
      } else {
        // subtract the change to make the price go down
        lastPrice -= change;
      }
      // save the price to the set's data array
      set.data.push(lastPrice);
    }
  };

  /**
   * Runs the algorithms over last generated data
   */
  function run () {
    /**
     * hold averages and prices over averaging range
     *
     * array of objects
     * avg: #
     * price: #
     * dollars: #
     * btc: #
     */
    var avgData = [];
    // calculate the average at each price in set.data
    for (var i = 0; i < set.data.length; i++) {
      // get the last calculated avg to determine if the avg is now moving up or down relative to the last avg
      var last = avgData[i-1] || avgData[i];
      // make a reference to the current price data, default to stay if buy or sell is not chosen after calculating the avg
      var current = {
        price: set.data[i],
        index: i,
        trade: 'stay',
      }
      // store all the avg data in an array
      avgData.push(current);
      // the first price point is treated special because there aren't enough points to do an average calc and there is no last point data to reference
      if (i === 0) {
        current.dollars = set.dollars;
        current.balance = set.dollars;
        current.btc = 0;
        // the price is the avg for the first point
        current.avg = current.price;
        // no further processing in this loop, move to i is 1
        continue;
      }
      // we currently have what we ended with after last buy/sell/stay decision
      current.dollars = last.dollars;
      current.btc = last.btc;
      // slice out a group of avg data the size of txsToAvg, for the next avg calc.
      // if there are less than txsToAvg in avgData, slice them all (sliceAt 0 gets them all)
      var sliceAt = 0;
      // there must be more avgData than txsToAvg for slice to not take the whole array
      if (avgData.length > set.txsToAvg) {
        sliceAt = avgData.length - 1 - set.txsToAvg;
      }
      // pass data to getAverage to determine the current price point avg
      current.avg = getAverage({
        data: avgData.slice(sliceAt),
        type: set.avgType,
        smoothing: set.smoothing,
      });
      // if current avg is greater than last avg, movement is trending up, otherwise down
      current.move = current.avg > last.avg ? 'up' : 'down';
      // if the move is a different direction the trend has reversed, making a top or bottom of the curve
      if (current.move !== last.move) {
        // mark tops and bottoms of waves
        last.position = current.move === 'up' ? 'bottom' : 'top';
      }
      // if there are enough points to make a buy or sell choice...
      if (i > set.min) {
        // allow buy/sell if avg changed over actionChange threshhold
        var avgDiff = Math.abs(current.avg - last.avg);
        if (avgDiff > set.actionChange) {
          if (current.avg < last.avg) {
            // sell if avg price starts declining
            current = trade({
              type: 'sell',
              current: current,
            });
          } else {
            // buy if avg price starts rising
            current = trade({
              type: 'buy',
              current: current,
            });
          }
        }
      }
      // calculate balances, assumes 100% of money in either dollars or btc
      if (current.dollars === 0) {
        current.balance = current.btc * current.price;
      } else {
        current.balance = current.dollars;
      }
    } // end for set.data.length
    set.avgData = avgData;
  };

  getAverage = function (opts) {
    try {
      // start with avg of 0, add to it in calcs
      var avg = 0;
      // do different calcs based on opts.type, which is the algorithm name
      switch (opts.type) {
        case 'naiveMethod':
          // naiveMethod assumes the price will continue to be the last price
          avg = opts.data[opts.data.length - 1].price;
          break;
        case 'simpleExponentialSmoothing':
          var weight = 0;
          var weightAdjustment;
          var a = opts.smoothing; // smoothing parameter
          var exponent = 0;
          // each avg back gets exponentially less important to the forward moving avg
          for (var i = opts.data.length - 1; i > -1; i--) {
            weight += a * Math.pow(1 - a, exponent);
            exponent += 1;
          }
          exponent = 0;
          weightAdjustment = 1 - weight;
          for (var i = opts.data.length - 1; i > -1; i--) {
            weight = a * Math.pow(1 - a, exponent);
            if (i === 0) {
              weight += weightAdjustment;
            }
            avg += weight * opts.data[i].price;
            exponent += 1;
          }
          break;
        case 'weightedMovingAvg':
          var weight = 0;
          for (var i = 0; i < opts.data.length; i++) {
            weight += i + 1;
          }
          // each avg back gets linearly less important to the forward moving avg
          for (var i = 0; i < opts.data.length; i++) {
            avg += opts.data[i].price * (i + 1) / weight;
          }
          break;
        default:
          throw new Error('average case not found');
      }
      return avg;
    } catch (error) {
      console.log(error.stack);
    }
  };

  /**
   * trades if balances available
   *
   * opts {}
   * type 'buy' or 'sell'
   * current {type, dollars, btc, price}
   */
  trade = function (opts) {
    opts.current.trade = 'stay';
    if (opts.type === 'buy') {
      // only buy if you have dollars
      if (opts.current.dollars !== 0) {
        opts.current.btc = opts.current.dollars / opts.current.price;
        opts.current.dollars = 0;
        opts.current.trade = 'buy';
      }
    } else {
      // only sell if you have btc
      if (opts.current.btc !== 0) {
        opts.current.dollars = opts.current.btc * opts.current.price;
        opts.current.btc = 0;
        opts.current.trade = 'sell';
      }
    }
    return opts.current;
  };
  return {
    getData: getData,
  }
}()); // end trader
