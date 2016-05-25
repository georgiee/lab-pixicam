define(['augment','utils/point'], function(augment, Point){

  var Rectangle = augment.defclass({
    constructor: function(x, y, width, height){
      x = x || 0;
      y = y || 0;
      width = width || 0;
      height = height || 0;
      
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    },
    clone: function () {
      return new Rectangle(this.x, this.y, this.width, this.height);
    },
    
    scaleWithPoint: function(point){
      return this.scale(point.x, point.y);
    },

    scale: function(ratioX, ratioY){
      if (typeof ratioY == "undefined"){
        ratioY = ratioX;
      }

      this.x = this.x * ratioX;
      this.y = this.y * ratioY;
      this.width = this.width * ratioX;
      this.height = this.height * ratioY;

      return this;
    },

    set: function (x, y, width, height) {

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        return this;

    }
  });
  //bunch of getters
  Object.defineProperty(Rectangle.prototype, "left", { get: function () { return this.x; } });
  Object.defineProperty(Rectangle.prototype, "right", { get: function () { return this.x + this.width; } });
  Object.defineProperty(Rectangle.prototype, "top", { get: function () { return this.y; } });
  Object.defineProperty(Rectangle.prototype, "bottom", { get: function () { return this.y + this.height; } });

  Object.defineProperty(Rectangle.prototype, "tl", {
    get: function () { return new Point(this.x, this.y); },

    set: function (value) {
        this.x = value.x;
        this.y = value.y;
    }
  });
  
  Object.defineProperty(Rectangle.prototype, "tr", { get: function () { return new Point(this.x + this.width, this.y); } });
  Object.defineProperty(Rectangle.prototype, "bl", { get: function () { return new Point(this.x, this.bottom); } });
  Object.defineProperty(Rectangle.prototype, "br", { get: function () { return new Point(this.right, this.bottom); } });


  Object.defineProperty(Rectangle.prototype, "centerX", {
      get: function () {
          return this.x + this.halfWidth;
      }
  });
  
  Object.defineProperty(Rectangle.prototype, "centerY", {

      get: function () {
          return this.y + this.halfHeight;
      }

  });
  Object.defineProperty(Rectangle.prototype, "halfWidth", {

    get: function () {
        return Math.round(this.width / 2);
    }

  });

  Object.defineProperty(Rectangle.prototype, "halfHeight", {

      get: function () {
          return Math.round(this.height / 2);
      }

  });

  return Rectangle;

});
