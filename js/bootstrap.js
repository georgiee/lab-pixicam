requirejs(['./require-config'], function() {
  requirejs(['jquery','domReady!', 'application'],
  function ($, document, Application) {
    Application.run();
  });
});