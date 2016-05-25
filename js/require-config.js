requirejs.config({
    baseUrl: 'js/pixicam',
    deps: ['pixi-extensions'],
    paths: {
        augment: '../vendor/augment',
        postal: '../vendor/postal',
        debugPanel : "debug/panel",
        vendor: '../vendor',
        backbone: '../vendor/backbone',
        pixi: '../vendor/pixi',
        lodash: '../vendor/lodash',
        Q: '../vendor/q',
        jquery: '../vendor/jquery-1.11.2.min',
        stats:'../vendor/stats',
        text : "../vendor/require-text",
        domReady : "../vendor/require-domReady",
        async : "../vendor/require-async",

        noext : "../vendor/require-noext",
        'gsap': '../vendor/TweenMax'
    },
    
    map: {
      "*": {
        underscore: 'lodash'  
      }
    },

    shim: {
      'gsap': {
        init: function() {
          return {
              TweenMax: TweenMax,
              TimelineMax: TimelineMax
          };
        }
      },

      stats: {
        exports: 'Stats'
      }

    }
});