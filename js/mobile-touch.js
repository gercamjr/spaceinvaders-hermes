/* mobile-touch.css - Touch handling for Octopus Invaders on mobile browsers */

(function() {
  // Prevent default scroll/zoom on the canvas element
  window.addEventListener('load', function() {
    var canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    // Block all touch gestures from propagating to the browser
    var passive = false;
    window.addEventListener('touchstart', prevent, { passive: false });
    window.addEventListener('touchmove',  prevent, { passive: false });
    window.addEventListener('touchend',   prevent, { passive: false });
    window.addEventListener('touchcancel',prevent, { passive: false });

    function prevent(e) {
      // Only prevent on canvas-related touches (ignore input elements etc.)
      var t = e.target;
      while (t && t !== document.body) {
        if (t === canvas) { e.preventDefault(); return; }
        t = t.parentNode;
      }
    }
  });
})();
