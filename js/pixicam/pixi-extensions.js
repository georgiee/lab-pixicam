define(['pixi'], function(PIXI){

  var mixinUpdateFunctions = function(){

    //post update loop for any container
    PIXI.Container.prototype.update = function(){
      
      for (var i = 0, j = this.children.length; i < j; ++i)
      {
          this.children[i].update();
      }
    }
    

    //post update loop for any container
    PIXI.Container.prototype.preUpdate = function(){
      
      for (var i = 0, j = this.children.length; i < j; ++i)
      {
          this.children[i].preUpdate();
      }
    }
    
    //post update loop for any container
    PIXI.Container.prototype.postUpdate = function(){
      if(this.body){
        this.body.postUpdate();
      }
      
      for (var i = 0, j = this.children.length; i < j; ++i)
      {
          this.children[i].postUpdate();
      }
    }
   
  }

  mixinUpdateFunctions();

})