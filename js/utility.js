var utility = (function () {
  /**
   * round a number down with a specified number of decimals left over
   */
  function round (value, decimals) {
    decimals = decimals || 0;
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
  }

  // subtract using integers to avoid things like 0.000131 - 0.000022 equaling 0.00010900000000000002 instead of 0.000109
  function doMath (type, val1, val2) {
    var types = ['add', 'subtract',];
    if (types.indexOf(type) === -1) {
      throw new Error('utility.doMath requires one of these types: ' + types + ', but received type: ' + type);
    }
    if (isNaN(val1) || isNaN(val2)) {
      throw new Error('utility.doMath only accepts numbers, but received val1 ' + val1 + ' of type ' + typeof(val1) + ' and val2 ' + val2 + ' of type ' + typeof(val2));
    }

    var val1Decimals = exports.countDecimals(val1);
    var val2Decimals = exports.countDecimals(val2);
    var biggerDecimals = Math.max(val1Decimals, val2Decimals);
    var tempVal1 = Number(val1 + 'e' + biggerDecimals);
    var tempVal2 = Number(val2 + 'e' + biggerDecimals);
    var tempAnswer;
    if (type === 'subtract') {
      tempAnswer = tempVal1 - tempVal2;
    } else if (type === 'add') {
      tempAnswer = tempVal1 + tempVal2;
    }
    var answer = Number(tempAnswer  + 'e-' + biggerDecimals);
    if (isNaN(answer)) {
      throw new Error('answer is not a number for type: ' + type + ', val1: ' + val1 + ', val2: ' + val2);
    }
    return answer
  }

  return {
    doMath: doMath,
    round: round,
  };
}()); // end utility
