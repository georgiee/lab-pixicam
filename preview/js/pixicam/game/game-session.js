define(['vendor/hammer'], function(Hammer){
  var game, hammerManager;

  var result = {
    init: function(game){
      result.game = game;
      result.hammer = new Hammer(game.renderer.view);
    }
  }
  
  return result;
})