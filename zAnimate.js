/**
 * @author zman
 * @date 2016-4-25
 */
(function (global, factory) {
	if (typeof module === "object" && typeof module.exports === "object") {
		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ? factory(global, true) : function (w) {
			if (!w.document) {
				throw new Error("smoothScroll requires a window with a document");
			}
			if (!w.jQuery) {
				throw new Error('smoothScroll requires a window with a Jquery');
			}
			return factory(w);
		};
	} else {
		factory(global);
	}

	// Pass this if window is not defined yet
})(typeof window !== "undefined" ? window : this, function (window, noGlobal) {
	'use strict';
	/*
	 * https://github.com/oblador/angular-scroll (duScrollDefaultEasing)
	 * 0-1
	 */
	var timing = {
		easing: function (x) {
			if (x < 0.5) {
				return Math.pow(x * 2, 2) / 2;
			}
			return 1 - Math.pow((1 - x) * 2, 2) / 2;
		},
		smooth: function (x) {
			return x;
		}
	};

	var bind = function (fn, scope) {
		return function () {
			fn.apply(scope, arguments);
		}
	};
	var $ = window.jQuery;
	/*
	 * Wraps window properties to allow server side rendering
	 */
	var currentWindowProperties = function () {
		if (typeof window !== 'undefined') {
			return window.requestAnimationFrame || window.webkitRequestAnimationFrame;
		}
	};

	/*
	 * Helper function to never extend 60fps on the webpage.
	 */
	var requestAnimationFrameHelper = (function () {
		return currentWindowProperties() ||
			function (callback, element, delay) {
				return window.setTimeout(callback, delay || (1000 / 60), Date.now());
			};
	})();

	function ZAnimate($el, property, callback, duration, timing) {
		if (!$el.length) {
			throw 'jQuery object is undefined';
		}
		this.__target = $el;
		this.init(property, callback, duration, timing);
	}

	ZAnimate.prototype = {
		__duration: 200,
		__stoped: false,
		__doing: false,
		__target: null,
		__delta: 0,
		__frames: {},
		__callback: null,
		__timing: 'easing',
		init: function (property, callback, duration, timing) {
			!isNaN(parseFloat(duration)) && (this.__duration = parseFloat(duration));
			this.__callback = callback;
			this.__timing = timing || this.__timing;
		},
		callback: function () {
			this.__doing = false;
			this.__frames = {};
			this.__callback && this.__callback();
			this.__target.trigger('zAnimateEnd');
		},
		step: function (timestamp) {
			if (!this.__target.parent().length) {//dom is destroyed
				this.stop();
			}
			if (this.__stoped) {
				return
			}
			this.__doing = true;
			var hasFrame = 0;
			var now = Date.now();
			var duration = this.__duration;
			var delta, item, finished, elapsed, position, que, total;
			for (var key in this.__frames) {
				if (!this.__frames.hasOwnProperty(key)) {
					return;
				}
				hasFrame++;
				que = this.__frames[key];
				total = 0;
				for (var i = 0; i < que.length; i++) {
					item = que[i];
					elapsed = now - item.start;
					finished = (elapsed >= duration);

					// scroll position: [0, 1]
					if (typeof this.__timing == 'function') {
						position = this.__timing((finished) ? 1 : elapsed / duration);
					} else {
						position = timing[this.__timing]((finished) ? 1 : elapsed / duration);
					}


					// only need the difference
					delta = (item.delta * position - item.last) >> 0;

					// add this to the total
					total += delta;

					// update last values
					item.last += delta;

					// delete and step back if it's over
					if (finished) {
						que.splice(i, 1);
						i--;
					}
				}

				if (window.devicePixelRatio) {
					//scrollX /= (window.devicePixelRatio;
					//scrollY /= window.devicePixelRatio;
				}
				switch (key) {
					case  'scrollLeft':
						this.__target[0].scrollLeft += total;
						break;
					case 'scrollTop':
						this.__target[0].scrollTop += total;
						break;
					default:
						this.__target.css(key, parseInt(this.__target.css(key)) + total);
						break;
				}
				if (!que.length) {
					delete this.__frames[key];
					hasFrame--;
				}
			}
			if (hasFrame) {
				requestAnimationFrameHelper.call(window, bind(this.step, this));
			} else {
				this.callback();
			}

		},
		pushFrame: function (property) {
			var now = Date.now(), value;
			for (var key in property) {
				if (!property.hasOwnProperty(key)) {
					return;
				}
				if (!this.__frames[key]) {
					this.__frames[key] = [];
				}
				value = property[key];
				if (value.from === undefined) {
					switch (key) {
						case 'scrollTop':
							value.from = this.__target.scrollTop();
							break;
						case 'scrollLeft':
							value.from = this.__target.scrollLeft();
							break;
						default :
							value.from = parseInt(this.__target.css(key));
							break;
					}
				}
				if (value.to === 'auto') {
					this.__target.css(key, 'auto');
					value.to = parseInt(this.__target.css(key));
					this.__target.css(key, value.from);
				}
				if (value.from !== undefined && value.to !== undefined) {
					value.delta = value.to - value.from;
				}
				if (value.delta) {
					value.last = (value.delta < 0) ? 0.99 : -0.99;
					value.start = now;
					this.__frames[key].push(value);
				}
			}
		},
		update: function (property, callback, duration, timing) {
			this.init(property, callback, duration, timing);
		},
		start: function () {
			this.__stoped = false;
			this.__doing = false;
			requestAnimationFrameHelper.call(window, bind(this.step, this));
		},
		isDoing: function () {
			return this.__doing;
		},
		stop: function () {
			if (this.isDoing()) {
				this.__stoped = true;
				this.__doing = false;
				this.__frames = {};
			}
			return this;
		}
	};
	/**
	 *
	 * @param $el
	 * @param property  {object}
	 * {
	*  scrollTop: {
	*	 from:0,
	*	 to:0,
	*	 delta:0
	*   },
	*  scrollLeft:{
	*    from:0,
	*    to:0,
	*    delta:0
	*  }
	*}
	 * @param callback,
	 * @param duration
	 * @param timing
	 */
	function createZAnimate($el, property, callback, duration, timing) {
		var zAnimate = $el.data('ZAnimate');
		if (zAnimate) {
			zAnimate.update(property, callback, duration, timing);
		} else {
			zAnimate = new ZAnimate($el, property, callback, duration, timing);
		}
		zAnimate.pushFrame(property);
		if (!zAnimate.isDoing()) {
			zAnimate.start();
		}
		$el.data('ZAnimate', zAnimate);
	}

	$.fn.zAnimate = function (property, callback, duration) {
		this.each(function () {
			createZAnimate($(this), property, callback, duration);
		});
	}
});