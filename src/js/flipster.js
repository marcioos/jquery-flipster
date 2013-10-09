+function($) { "use strict";

    var Flipster = function(element, options) {
        this.options = options;
        this.$element = $(element);
        this.$itemContainer = this.$element.find(options.itemContainer);
        this.$flipItems = this.$itemContainer.find(options.itemSelector);
        this.compatibility = false;
        this.current = 0;
        this.startTouchX = 0;
        this.itemsLoaded = 0;
        this.init();
    };

    Flipster.DEFAULTS = {
        itemContainer:      'ul', // Container for the flippin' items.
        itemSelector:       'li', // Selector for children of itemContainer to flip
        start:              'center', // Starting item. Set to 0 to start at the first, 'center' to start in the middle or the index of the item you want to start with
        enableKeyboard:     true, // Enable left/right arrow navigation
        enableTouch:        true, // Enable swipe navigation for touch devices
        activityIndicator:  null, // jQuery object used to indicate coverflow loading activity
        coverflowObserver:     null, // jQuery object that will receive events related to coverflow
        onItemSwitch:       function(){}, // Callback function when items are switches
        onCurrentItemClick:        function(){}, // Callback function when current item is clicked
        onCurrentItemMouseEnter:        function(){}, // Callback function when mouse enters current item area
        onCurrentItemMouseLeave:        function(){} // Callback function when mouse leaves current item area        
    };

    Flipster.prototype.init = function() {
        var $flipster = this;

        if ($flipster.options.activityIndicator) {
            // hide any coverflow-activity before showing activityIndicator
            $('.coverflow-activity').hide(0);
            $flipster.options.activityIndicator.activity();
            $flipster.options.activityIndicator.show(0);
        }
        // Basic setup
        $flipster.$element.addClass("flipster flipster-active flipster-coverflow").hide(0);
        $flipster.$element.css("padding-bottom", "5%");
        $flipster.$itemContainer.addClass("flip-items");
        $flipster.$flipItems.addClass("flip-item flip-hidden").wrapInner("<div class='flip-content' />");

        //Browsers that don't support CSS3 transforms get compatibility:
        var isIEmax8 = ('\v' === 'v'); //IE <= 8
        var checkIE = document.createElement("b");
        checkIE.innerHTML = "<!--[if IE 9]><i></i><![endif]-->"; //IE 9
        var isIE9 = checkIE.getElementsByTagName("i").length === 1;
        if (isIEmax8 || isIE9) {
            $flipster.compatibility = true;
            $flipster.$itemContainer.addClass("compatibility");
        }

        // Set the starting item
        if ($flipster.options.start && ($flipster.$flipItems.length > 1)) {
            // Find the middle item if start = center
            if ($flipster.options.start === 'center') {
                if (!$flipster.$flipItems.length % 2) {
                    $flipster.current = $flipster.$flipItems.length/2 + 1;
                } else {
                    $flipster.current = Math.floor($flipster.$flipItems.length/2);
                }
            } else {
                $flipster.current = $flipster.options.start;
            }
        }

        // initialize containers
        $flipster.resize();

        // Attach event bindings.
        $(window).resize(function() {
            $flipster.resize();
            $flipster.center();
        });

        // Calls onCurrentItemClick when current item is clicked.
        $flipster.$flipItems.on('click', function () {
            if ($(this).hasClass("flip-current"))
                $flipster.options.onCurrentItemClick.call(this);
        });

        // Calls onCurrentItemMouseEnter and onCurrentItemMouseLeave on current item mouseenter and mouseleave events.
        $flipster.$flipItems.hover(function () {
            if ($(this).hasClass("flip-current"))
                $flipster.options.onCurrentItemMouseEnter.call(this);
        }, function () {
            if ($(this).hasClass("flip-current"))
                $flipster.options.onCurrentItemMouseLeave.call(this);
        });

        // Navigate directly to an item by clicking
        $flipster.$flipItems.on("click", function(e) {
            if (!$(this).hasClass("flip-current")) e.preventDefault();
            $flipster.jump($flipster.$flipItems.index(this));
        });

        // Keyboard Navigation
        if ($flipster.options.enableKeyboard && $flipster.$flipItems.length > 1 ) {
            $(window).on("keydown.flipster", function(e) {
                var code = e.which;
                if (code === 37 ) {
                    if (isNotInFirstElement()) {
                        e.preventDefault();
                        $flipster.jump('left');
                    }
                }
                else if (code === 39 ) {
                    if (isNotInLastElement()) {
                        e.preventDefault();
                        $flipster.jump('right');
                    }
                }
            });
        }

        // Touch Navigation
        if ($flipster.options.enableTouch && $flipster.$flipItems.length > 1 ) {
            $flipster.$element.on("touchstart.flipster", function(e) {
                $flipster.startTouchX = e.originalEvent.targetTouches[0].screenX;
            });

            $flipster.$element.on("touchmove.flipster", function(e) {
                e.preventDefault();
                var nowX = e.originalEvent.targetTouches[0].screenX;
                var touchDiff = nowX-$flipster.startTouchX;
                if (touchDiff > $flipster.$flipItems[0].clientWidth/3.5){
                    if (isNotInFirstElement()) {
                        $flipster.jump("left");
                        $flipster.startTouchX = nowX;
                    }
                }else if (touchDiff < -1*($flipster.$flipItems[0].clientWidth/3.5)){
                    if (isNotInLastElement()) {
                        $flipster.jump("right");
                        $flipster.startTouchX = nowX;
                    }
                }
            });

            $flipster.$element.on("touchend.flipster", function(e) {
                $flipster.startTouchX = 0;
            });
        }

        var $images = $flipster.$flipItems.find('img');

        if ($images.length > 0) {
            // keeps track of loaded images.
            //   when every image finished loading, if there is an activityIndicator visible, hide it.
            //   regardless of an activityIndicator existence, shows coverflow.
            $images.one('load', function() {
                $flipster.itemsLoaded++;
                if ($flipster.itemsLoaded === $flipster.$flipItems.size()) showCoverflow();
            }).each(function() {
                if (this.complete) $(this).load();
            });
        } else {
            showCoverflow();
        }

        function showCoverflow() {
            if ($flipster.options.activityIndicator && $flipster.options.activityIndicator.is(":visible"))
                $flipster.options.activityIndicator.hide(0, function() {
                    $flipster.$element.css("visibility","visible").show(0, function(){ $flipster.resize(); $flipster.center(); });
                    $flipster.options.activityIndicator.activity(false);
                });
            else
                $flipster.$element.css("visibility","visible").show(0, function(){ $flipster.resize(); $flipster.center(); });
            if ($flipster.options.coverflowObserver) {
                $flipster.options.coverflowObserver.trigger('loadFinished');
            }            
        }

        function isNotInLastElement() {
            return $flipster.current < ($flipster.$flipItems.length - 1);
        }

        function isNotInFirstElement() {
            return $flipster.current > 0;
        }
    }

    Flipster.prototype.resize = function() {
        var $flipster = this;
        $flipster.$itemContainer.css("height", calculateBiggestFlipItemHeight() + "px");
        $flipster.$element.css("height","auto");

        function calculateBiggestFlipItemHeight() {
            var biggestHeight = 0;
            $flipster.$flipItems.each(function() {
                if ($(this).height() > biggestHeight) biggestHeight = $(this).height();
            });
            return biggestHeight;
        }
    }

    Flipster.prototype.center = function() {
        var $flipster = this;
        var currentItem = $($flipster.$flipItems[$flipster.current]).addClass("flip-current");

        $flipster.$flipItems.removeClass("flip-prev flip-next flip-current flip-past flip-future no-transition");

        var spacer = currentItem.outerWidth()/2;
        var totalLeft = 0;
        var totalWidth = $flipster.$itemContainer.width();
        var currentWidth = currentItem.outerWidth();
        var currentLeft = ($flipster.$flipItems.index(currentItem)*currentWidth)/2 +spacer/2;
        
        $flipster.$flipItems.removeClass("flip-hidden");

        for (i = 0; i < $flipster.$flipItems.length; i++) {
            var thisItem = $($flipster.$flipItems[i]);
            var thisWidth = thisItem.outerWidth();
            
            if (i < $flipster.current) {
                thisItem.addClass("flip-past")
                    .css({
                        "z-index" : $flipster.$flipItems.length - Math.abs($flipster.current - i),
                        "left" : ((i+0.5)*thisWidth/2)+"px",
                        "bottom" : "0",
                        "opacity": String(0.95 / (Math.pow(2, Math.abs(i - ($flipster.current - 1))))),
                        "filter": "alpha(opacity=" + 95 / (Math.pow(2, Math.abs(i - ($flipster.current - 1)))) + ")"
                    });
            }
            else if ( i > $flipster.current ) {
                thisItem.addClass("flip-future")
                    .css({
                        "z-index" : $flipster.$flipItems.length - Math.abs($flipster.current - i),
                        "left" : ((i-0.5)*thisWidth/2)+spacer+"px",
                        "bottom" : "0",
                        "opacity": String(0.95 / (Math.pow(2, Math.abs(i - ($flipster.current + 1))))),
                        "filter": "alpha(opacity=" + 95 / (Math.pow(2, Math.abs(i - ($flipster.current + 1)))) + ")"
                    });
            }
        }

        currentItem.css({
            "z-index" : $flipster.$flipItems.length,
            "left" : currentLeft +"px",
            "bottom" : "0"
        });

        totalLeft = (currentLeft + (currentWidth/2)) - (totalWidth/2);
        var newLeftPos = -1*(totalLeft)+"px";

        /* Untested Compatibility */
        if ($flipster.compatibility) {
            var leftItems = $(".flip-past");
            var rightItems = $(".flip-future");
            $(".flip-current").css("zoom", "1.0");
            for (i = 0; i < leftItems.length; i++) {
                $(leftItems[i]).css("zoom", (100-((leftItems.length-i)*5)+"%"));
            }
            for (i = 0; i < rightItems.length; i++) {
                $(rightItems[i]).css("zoom", (100-((i+1)*5)+"%"));
            }

            $flipster.$itemContainer.animate({"left":newLeftPos}, 333);
        }
        else {
            $flipster.$itemContainer.css("left", newLeftPos);
        }

        currentItem
            .addClass("flip-current")
            .removeClass("flip-prev flip-next flip-past flip-future flip-hidden");

        $flipster.resize();
        $flipster.options.onItemSwitch.call($flipster);
    }

    Flipster.prototype.jump = function(to) {
        if ( $flipster.$flipItems.length > 1 ) {
            if ( to === "left" ) {
                if ( $flipster.current > 0 ) { $flipster.current--; }
                else { $flipster.current = $flipster.$flipItems.length-1; }
            }
            else if ( to === "right" ) {
                if ( $flipster.current < $flipster.$flipItems.length-1 ) { $flipster.current++; }
                else { $flipster.current = 0; }
            } else if ( typeof to === 'number' ) {
                $flipster.current = to;
            } else {
                // if object is sent, get its index
                $flipster.current = $flipster.$flipItems.index(to);
            }
            $flipster.center();
        }
    }

    // FLIPSTER PLUGIN DEFINITION
    // ==========================
    $.fn.flipster = function(option) {
        return this.each(function() {
            $(this).data('flipster', new Flipster(this, $.extend({}, Flipster.DEFAULTS, option)));
        });
    };

    $.fn.flipster.Constructor = Flipster;

}(window.jQuery);
