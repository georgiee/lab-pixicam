define(['augment','pixi'], function(augment, PIXI){
  
  var World = augment(PIXI.Container, function(uber){
    this.constructor = function(camera){
      uber.constructor.apply(this, arguments);
      this.camera = camera;
    }
    
    //use the camera to transform this container
    this.updateTransform = function(){
      var pt = this.camera.transform;
      var wt = this.worldTransform;

      // temporary matrix variables
      var a, b, c, d, tx, ty;

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
    },
    
    this.update = function(){
      //Kickoff the update call to all children. This update function
      //is a pixi extension of PIXI.Container (mixed in by my pixi extension file).
      
      for (var i = 0, j = this.children.length; i < j; ++i){   
        if(this.children[i]){
          this.children[i].update();
        }
      }
    }
  });

  return World;
})