var augment = require('./vendor/augment');
var Camera = require('./camera');
var Rectangle = require('./math/rectangle');
var Minimap = require('./minimap');
var CameraConstrain = require('./camera-constrain');
var Mixins = require('./mixins');

var World = augment(PIXI.Container, function(uber){
  
  this.constructor = function(options){
    uber.constructor.apply(this, arguments);

    options.width
    options.height
    options.screenWidth
    options.screenHeight
    options.centerX
    options.centerY

    this.worldRectangle = new Rectangle(options.centerX, options.centerY, options.width, options.height)
    this.camera = new Camera(options.screenWidth, options.screenHeight);
    this.camera.zoomPivotX = this.camera.viewCenterX = options.screenWidth/2;
    this.camera.zoomPivotY = this.camera.viewCenterY = options.screenHeight/2;
    this.cameraConstrain = new CameraConstrain({ worldBounds: this.worldRectangle });
  }

  this.setSize = function(width, height){
    this.worldRectangle.width = width;
    this.worldRectangle.height = height;
  }

  this.setScreenSize = function(screenWidth, screenHeight){
    this.camera.setScreenSize(screenWidth, screenHeight);
  }

  this.setCenter = function(x, y){

  }

  this.update = function(){
    this.camera.update();
    this.cameraConstrain.update(this.camera);
      
    if(!World.__updateMixed) return;
    
    //Kickoff the update call to all children. This update function
    //is a pixi extension of PIXI.Container (mixed in by my pixi extension file).

    for (var i = 0, j = this.children.length; i < j; ++i){   
      if(this.children[i]){
        this.children[i].update();
      }
    }
  };
  
  //use the camera to transform this container
  this.updateTransform = function(){
    var pt = this.camera.transform;
    var wt = this.worldTransform;

    // temporary matrix variables
    var a, d, tx, ty;

    // lets do the fast version as we know there is no rotation..
    a  = this.scale.x;
    d  = this.scale.y;

    tx = this.position.x - this.pivot.x * a;
    ty = this.position.y - this.pivot.y * d;

    wt.a  = a  * pt.a;
    wt.b  = a  * pt.b;
    wt.c  = d  * pt.c;
    wt.d  = d  * pt.d;
    wt.tx = tx * pt.a + ty * pt.c + pt.tx;
    wt.ty = tx * pt.b + ty * pt.d + pt.ty;

    for (var i = 0, j = this.children.length; i < j; ++i){
      this.children[i].updateTransform();
    }
  };

});

World.mixinUpdates = function(){
  World.__updateMixed = true;
  Mixins.addContainerUpdates();
}

module.exports = World;