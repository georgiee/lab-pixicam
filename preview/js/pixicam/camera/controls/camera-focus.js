define(["augment",'debug/panel','utils/rectangle','gsap','Q'],
  function(augment, debugPanel, Rectangle, gsap, Q){

  var TweenMax = gsap.TweenMax;

  var CameraFocus = augment.defclass({
    constructor: function(camera){
      this.camera = camera;
    },

    focusOn: function(sprite){
      var bounds = this.getSpriteBounds(sprite);
      return this.tweenCameraTo(bounds.centerX, bounds.centerY, 1);
    },

    zoomTo: function(sprite){
      return this.focusOnRectangle(this.getSpriteBounds(sprite));
    },
    
    getSpriteBounds: function(sprite){
      var w1 = sprite.width * ( - sprite.anchor.x);
      var h1 = sprite.height * ( - sprite.anchor.y);
      var bounds = new Rectangle(sprite.x + w1, sprite.y + h1, sprite.width, sprite.height);

      return bounds;
    },

    focusOnRectangle: function(bounds){
      var screenView = this.camera.getViewSize();
      var targetZoom = 1/Math.max(bounds.width/screenView.width, bounds.height/screenView.height);

      var x = bounds.centerX;
      var y = bounds.centerY;
      
      return this.tweenCameraTo(x, y, targetZoom);
    },
    
    tweenCameraTo: function(x, y, zoom){
      var deferred = Q.defer();
      var zoom = zoom || 1;

      var tl = new TimelineMax({onComplete: deferred.resolve});
      var duration = 0.8;
      tl.to(this.camera, .8, { zoom: 0.5, ease: Power2.easeInOut })
      .to(this.camera, duration, { zoom: zoom, ease: Power3.easeIn }, "final")
      .to(this.camera, duration, { x: x, y: y}, "final");
    
      return deferred.promise;    
    }
  })

  return CameraFocus;
})