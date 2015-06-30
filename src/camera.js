var bindAll = require('lodash/function/bindAll'),
  augment = require('./vendor/augment'),
  glmatrix = require('./vendor/gl-matrix'),
  Rectangle = require('./math/rectangle'),
  Point = require('./math/point');
  
var mat2d = glmatrix.mat2d;
var vec2 = glmatrix.vec2;

var Camera = augment.defclass({
  constructor: function(screenWidth, screenHeight){
    bindAll(this);

    this._position = new Point(0, 0);
    this._positionLimited = new Point(0, 0);
    this._zoomPivot = new Point(0, 0);
    this._viewCenter = new Point(0, 0);
    this._zoom = 1;
    this._rotation = 0;

    this.view = new Rectangle(0,0, screenWidth, screenHeight);
    //calculated world viewport
    this._viewport = new Rectangle(0, 0, 0, 0);

    this.transform = new PIXI.Matrix();
  },
  
  unfollow: function(){
    this.followTarget = undefined;
  },

  follow: function(target){
    this.followTarget = target;
  },

  getInverseMatrix: function(){
    var m = this.getMatrix();
    return mat2d.invert([], m);
  },
  
  cameraToWorldPoint: function(p){
    return this.worldToScreen(p);
  },

  worldToCameraPoint: function(p){
    return this.screenToWorld(p);
  },

  transformPoint: function(point, matrix){
    var p = [point.x, point.y];
    p = vec2.transformMat2d([], p, matrix);

    return {x: p[0], y: p[1]};
  },

  worldToScreen: function(point){
    return this.transformPoint(point, this.getMatrix());
  },

  screenToWorld: function(point){
    return this.transformPoint(point, this.getInverseMatrix());
  },

  tranformRect: function(rect, matrix){
    //calculate our camera window to the world view
    var tl = this.transformPoint(rect.tl, matrix);
    var br = this.transformPoint({x: rect.width, y: rect.height}, matrix);

    return new Rectangle(tl.x, tl.y,br.x-tl.x,br.y-tl.y);
  },
  worldRectToScreen: function(rect){
    return this.tranformRect(rect, this.getInverseMatrix());
  },

  getViewSize: function(){
    return this.view;
  },
  
  setScreenSize: function(width, height){
    this.view.width = width;
    this.view.height = height;
  },

  getViewport: function(){
    //calculate our camera window to the world view
    var tl = this.worldToScreen(Point.ZERO);
    var br = this.worldToScreen({x: this.view.width, y: this.view.height});

    this._viewport.set(tl.x, tl.y, (br.x-tl.x),(br.y-tl.y));
    
    //remove the view center ?
    //this._viewport.set(tl.x + this._viewCenter.x, tl.y + this._viewCenter.y, (br.x-tl.x),(br.y-tl.y));
    
    return this._viewport;
  },

  getMatrix: function(){
    var mat = mat2d.identity([]);
    mat2d.translate(mat, mat, [this._zoomPivot.x, this._zoomPivot.y ]);
    
    var position = [this._position.x, this._position.y];
    this.view.x = this._position.x;
    this.view.y = this._position.y;

    mat2d.translate(mat, mat, [-this._viewCenter.x, -this._viewCenter.y]); //apply position
    mat2d.translate(mat, mat, position); //apply position
    mat2d.scale(mat, mat, [1/this.zoom, 1/this.zoom]); //apply camera zoom
    mat2d.rotate(mat, mat, this._rotation); //apply camera zoom
    mat2d.translate(mat, mat, [-this._zoomPivot.x, -this._zoomPivot.y ]);

    return mat;
  },
  update: function(){
    if(this.followTarget){
      this.x = this.followTarget.x;
      this.y = this.followTarget.y;
    }

    this.updateTransform();
  },

  updateTransform: function(){
    var mat = this.getInverseMatrix();
    var wt = this.transform;

    wt.a  = mat[0];
    wt.b  = mat[1];
    wt.c  = mat[2];
    wt.d  = mat[3];
    wt.tx = mat[4];
    wt.ty = mat[5];
  }
});


Object.defineProperty(Camera.prototype, 'zoom', {

    get: function () {
        return this._zoom;
    },

    set: function (value) {

        //never smaller fro the moment
        if(value < 0.1){
          value = 0.1;
        }

        this._zoom = value;
    }

});

Object.defineProperty(Camera.prototype, 'viewCenterX', {

    get: function () {
        return this._viewCenter.x;
    },

    set: function (value) {
        this._viewCenter.x = value;
    }

});


Object.defineProperty(Camera.prototype, 'viewCenterY', {

    get: function () {
        return this._viewCenter.y;
    },

    set: function (value) {
        this._viewCenter.y = value;
    }

});


Object.defineProperty(Camera.prototype, 'zoomPivotX', {

    get: function () {
        return this._zoomPivot.x;
    },

    set: function (value) {
        this._zoomPivot.x = value;
    }

});


Object.defineProperty(Camera.prototype, 'zoomPivotY', {

    get: function () {
        return this._zoomPivot.y;
    },

    set: function (value) {
        this._zoomPivot.y = value;
    }

});

Object.defineProperty(Camera.prototype, 'x', {

    get: function () {
        return this._position.x;
    },

    set: function (value) {
        this._position.x = value;
    }

});

Object.defineProperty(Camera.prototype, 'y', {

    get: function () {
        return this._position.y;
    },

    set: function (value) {

        this._position.y = value;
    }

});

Object.defineProperty(Camera.prototype, 'rotation', {

    get: function () {
        return this._rotation;
    },

    set: function (value) {

        this._rotation = value;
    }

});

module.exports = Camera;