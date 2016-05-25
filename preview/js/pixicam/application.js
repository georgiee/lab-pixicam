define(['backbone', 'debug/stats-instance','game/game-session', 'views/demo-view'], 
  function(Backbone, Stats, gameSession, DemoView){
  gameSession.stats = Stats;
  
  var Application = Backbone.Router.extend({
    routes: {
      "": "index"
    },
    
    index: function(){
      DemoView.run();
    }

    
  })
  
  return {
    run: function(){
      var application = new Application();
      Backbone.history.start();
    }
  };
})