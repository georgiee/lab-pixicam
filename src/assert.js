module.exports = function (expression, message) {
  if(!expression){
    throw new Error(message);
  }
}