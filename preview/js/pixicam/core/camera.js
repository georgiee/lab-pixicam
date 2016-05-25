define(['underscore','augment','pixi','vendor/gl-matrix','debug/panel','utils/rectangle','utils/point'], function(_, augment, PIXI,glmatrix, debugPanel, Rectangle, Point){
  
  //camera space, world space, viewport space
  

  /*
  
  The camera view matrix is the inverse of scale * rotation * translation.
  This transforms from world-space to camera-space which is what you want. 
  */
  
  var mat2d = glmatrix.mat2d;

  var Camera = augment.defclass({
    constructor: function(screenWidth, screenHeight){
      _.bindAll(this);

      this._position = new Point(0, 0);
      this._positionLimited = new Point(0, 0);
      this._zoomPivot = new Point(0, 0);
      this._viewCenter = new Point(0, 0);
      this._zoom = 1;

      this.view = new Rectangle(0,0, screenWidth, screenHeight);
      //calculated world viewport
      this._viewport = new Rectangle(0, 0, 0, 0);

      this.transform = new PIXI.Matrix();

      this.limited = false;
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
      var p = glmatrix.vec2.transformMat2d([], p, matrix);

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
    worldRectToScreen: function(rect, matrix){
      return this.tranformRect(rect, this.getInverseMatrix());
    },

    getViewSize: function(){
      return this.view;
    },

    getViewport: function(){
      var mat = this.getInverseMatrix();
      //calculate our camera window to the world view
      var tl = this.worldToScreen(Point.ZERO);
      var br = this.worldToScreen({x: this.view.width, y: this.view.height});

      this._viewport.set(tl.x, tl.y, (br.x-tl.x),(br.y-tl.y));

      return this._viewport;
    },

    getMatrix: function(){
      var mat = mat2d.identity([]);
      mat2d.translate(mat, mat, [this._zoomPivot.x, this._zoomPivot.y ]);
      
      var position = [this.view.x, this.view.y]
      mat2d.translate(mat, mat, [-this._viewCenter.x, -this._viewCenter.y]); //apply position
      mat2d.translate(mat, mat, position); //apply position
      mat2d.scale(mat, mat, [1/this.zoom, 1/this.zoom]); //apply camera zoom
      
      mat2d.translate(mat, mat, [-this._zoomPivot.x, -this._zoomPivot.y ]);

      return mat;
    },
    update: function(){
      if(this.followTarget){
        this.x = this.followTarget.x
        this.y = this.followTarget.y
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
  
  
  Object.defineProperty(Camera.prototype, "zoom", {

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

  Object.defineProperty(Camera.prototype, "viewCenterX", {

      get: function () {
          return this._viewCenter.x;
      },

      set: function (value) {
          this._viewCenter.x = value
      }

  });


  Object.defineProperty(Camera.prototype, "viewCenterY", {

      get: function () {
          return this._viewCenter.y;
      },

      set: function (value) {
          this._viewCenter.y = value
      }

  });


  Object.defineProperty(Camera.prototype, "zoomPivotX", {

      get: function () {
          return this._zoomPivot.x;
      },

      set: function (value) {
          this._zoomPivot.x = value
      }

  });


  Object.defineProperty(Camera.prototype, "zoomPivotY", {

      get: function () {
          return this._zoomPivot.y;
      },

      set: function (value) {
          this._zoomPivot.y = value
      }

  });


  Object.defineProperty(Camera.prototype, "position", {

      get: function () {
          this._position.set(this.view.x, this.view.y);
          return this._position;
      },

      set: function (value) {

          if (typeof value.x !== "undefined") { this.view.x = value.x; }
          if (typeof value.y !== "undefined") { this.view.y = value.y; }

      }

  });

  Object.defineProperty(Camera.prototype, "positionLimited", {

        get: function () {
            //this._positionLimited.set(this.view.x, this.view.y);
            return this._positionLimited;
        },

        set: function (value) {

            if (typeof value.x !== "undefined") { this._positionLimited.x = value.x; }
            if (typeof value.y !== "undefined") { this._positionLimited.y = value.y; }

        }

    });


  Object.defineProperty(Camera.prototype, "x", {

      get: function () {
          return this.view.x;
      },

      set: function (value) {

          this.view.x = value;
      }

  });

  Object.defineProperty(Camera.prototype, "y", {

      get: function () {
          return this.view.y;
      },

      set: function (value) {

          this.view.y = value;
      }

  });




  return Camera;
});