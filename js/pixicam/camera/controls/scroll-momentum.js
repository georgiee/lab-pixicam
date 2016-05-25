define(['augment'], function(augment){
  var ScrollMomentum = augment.defclass({
    constructor: function(max){
      this.speed = 0;
      this.acceleration = 0;
      this.speedThreshold = 0.1;
      this.max = max || 1;
    },
    
    resetForces: function(){
      this.speed = 0;
      this.acceleration = 0;
    },

    resetAcceleration: function(){
      this.acceleration = 0;
    },

    update: function(){
      var speed = this.speed;

      speed += this.acceleration;
      if(speed == 0){ return }

      if(speed > this.max){
        speed = this.max
      }else if(speed < -this.max){
        speed = -this.max;
      }

      if(Math.abs(speed) < this.speedThreshold){
        speed = 0;
      }
      
      this.speed = speed * 0.95;
    }
  });

  return ScrollMomentum;
})