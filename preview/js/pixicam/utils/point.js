define(['augment'], function(augment){

  var Point = augment.defclass({
    constructor: function(x, y){
      x = x || 0;
      y = y || 0;
      
      this.x = x;
      this.y = y;
    },
    subtract: function(p){
      this.x = this.x - p.x;
      this.y = this.y - p.y;

      return this;
    },
    add: function(p){
      this.x = this.x + p.x;
      this.y = this.y + p.y;

      return this;
    },
    
    toArray: function(){
      return [this.x, this.y];
    },
    reset: function(){
      this.set(0,0);
    },
    
    lengthSq: function () {

      return this.x * this.x + this.y * this.y;

    },

    length: function () {

      return Math.sqrt( this.x * this.x + this.y * this.y );

    },

    divideScalar: function ( scalar ) {

      if ( scalar !== 0 ) {

        var invScalar = 1 / scalar;

        this.x *= invScalar;
        this.y *= invScalar;

      } else {

        this.x = 0;
        this.y = 0;

      }

      return this;

    },
    
    clone: function(){
      return new Point(this.x, this.y);
    },

    normalize: function () {

      return this.divideScalar( this.length() );

    },
    

    set: function (x, y) {

        this.x = x;
        this.y = y;

        return this;

    }
  });
  
  Point.ZERO = new Point();
  
  Point.subtract = function(p1, p2){
    var p1 = new Point(p1.x,p1.y);
    var p2 = new Point(p2.x,p2.y);
    return p1.clone().subtract(p2);
  }

  Point.fromAngle = function(angle, magnitude){
    var x = Math.cos(angle) * magnitude;
    var y = Math.sin(angle) * magnitude;
    return new Point(x, y);
  }

  return Point;

});
