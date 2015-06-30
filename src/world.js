var augment = require('./vendor/augment');
var Camera = require('./camera');
var Rectangle = require('./math/rectangle');
var Minimap = require('./minimap');
var CameraConstrain = require('./camera-constrain');
var Mixins = require('./mixins');
var assert = require('./assert');

var World = augment(PIXI.Container, function(uber){
  
  this.constructor = function(options){
    uber.constructor.apply(this, arguments);

    var x = options.x || 0;
    var y = options.y || -options.height/2;
    var screenWidth = options.screenWidth;
    var screenHeight = options.screenHeight;
    assert(screenWidth, 'You must provide a screen width');
    assert(screenHeight, 'You must provide a screen height');

    this.worldRectangle = new Rectangle(x, y, options.width, options.height)
    this.camera = new Camera(screenWidth, screenHeight);
    this.camera.viewCenterX = screenWidth/2;
    this.camera.viewCenterY = screenHeight/2;
    
    this.camera.zoomPivotX = screenWidth/2;
    this.camera.zoomPivotY = screenHeight/2;

    this.cameraConstrain = new CameraConstrain({ worldBounds: this.worldRectangle });
    this.cameraConstrain.active = options.constrain === true;

    this._screenWidth = screenWidth;
    this._screenHeight = screenHeight;
    //this will hold all children that should be transformed by the camera
    this.worldContainer = new PIXI.Container();
    uber.addChild.call(this, this.worldContainer);
    //any other child of this
    
    this._showMinimap = false;
    //this.minimap = true;
  }
  
  this.destroyMinimap = function(){
    if(!this._minimapInstance) return;

    this._minimapInstance = undefined;
    this.removeGlobalChild(this._minimapInstance);
  }

  this.createMinimap = function(width, height){
    if(this._minimapInstance) return;

    var width = width || 300;
    var height = height || 150;

    var minimapInstance = new Minimap(width, height, this.camera);
    minimapInstance.setWorldBounds(this.worldRectangle);
    minimapInstance.position.set(this._screenWidth - width, this._screenHeight - height);
    this.addGlobalChild(minimapInstance);

    this._minimapInstance = minimapInstance;
  }

  this.setSize = function(width, height){
    this.worldRectangle.width = width;
    this.worldRectangle.height = height;
  }

  this.setScreenSize = function(screenWidth, screenHeight){
    this._screenWidth = screenWidth;
    this._screenHeight = screenHeight;
    
    this.camera.setScreenSize(this._screenWidth, this._screenHeight);
  }
  
  this.addGlobalChild = function(child){
    uber.addChild.call(this, child);
  }
  this.removeGlobalChild = function(child){
    uber.removeChild.call(this, child);
  }

  this.addChild = function(child){
    this.worldContainer.addChild(child);
  }

  this.removeChild = function(child){
    this.worldContainer.removeChild(child);
  }

  this.update = function(){
    //update & constrain the attached camera
    this.camera.update();
    this.cameraConstrain.update(this.camera);
    
    if(this.minimap){
      this._minimapInstance.update();
    }
    
    //check if the world mixed in the update method, which is handy on our children to follow
    //the camera or whatever should be done durign each update
    if(!World.__updateMixed) return;
    
    //Kickoff the update call to all children. We can now
    //assume update is available on all children.
    for (var i = 0, j = this.children.length; i < j; ++i){   
      if(this.children[i]){
        this.children[i].update();
      }
    }
  };
  
  //override pixi's updateTransform, merge the camera transform values
  //and then contine with updatig the children of this world
  this.updateTransform = function(){
    uber.updateTransform.call(this);
    this.updateWorldTransform();
  }
  
  this.updateWorldTransform = function(){
    var ct = this.camera.transform;
    var pt = this.worldTransform;
    var wt = this.worldContainer.worldTransform;
    
    //this will merge the camera view with the world container transform (this is not recommened to do so, so just in case)
    ct.prepend(pt);
    
    //console.log(pt, wt)
    //debugger;
    // temporary matrix variables
    var a, d, tx, ty;

    // lets do the fast version as we know there is no rotation..
    a  = this.worldContainer.scale.x;
    d  = this.worldContainer.scale.y;

    tx = this.worldContainer.position.x - this.worldContainer.pivot.x * a;
    ty = this.worldContainer.position.y - this.worldContainer.pivot.y * d;

    wt.a  = a  * ct.a;
    wt.b  = a  * ct.b;
    wt.c  = d  * ct.c;
    wt.d  = d  * ct.d;
    wt.tx = tx * ct.a + ty * ct.c + ct.tx;
    wt.ty = tx * ct.b + ty * ct.d + ct.ty;

    for (var i = 0, j = this.worldContainer.children.length; i < j; ++i){
      this.worldContainer.children[i].updateTransform();
    }
  };

});

World.mixinUpdates = function(){
  World.__updateMixed = true;
  Mixins.addContainerUpdates();
}

Object.defineProperty(World.prototype, 'minimap', {

    get: function () {
        return this._showMinimap;
    },

    set: function (value) {
        this._showMinimap = value;
        if(this._showMinimap){
          this.createMinimap();  
        }else{
          this.destroyMinimap();
        }
        
    }

});

module.exports = World;