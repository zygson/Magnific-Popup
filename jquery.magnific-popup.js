/**
* 
* MagnificPopup | http://dimsemenov.com/magnific
*
* @version 0.0.5:
*
*/
;(function($) {

	"use strict";

	function MagnificPopup(data) {
		var self = this;

		// TODO find a better way to find browsers that handle fixed position badly
		self.isAndroid = (/android/gi).test(navigator.appVersion);
		self.isIOS = (/iphone|ipad|ipod/gi).test(navigator.appVersion);
		// mobile webkit doesn't play nicely with fixed position, so we use different technique for it
		self.supportsFixedPositon = !(self.isAndroid || self.isIOS);

		self.bodyhtml = $('body, html');
		self.win = $(window);
		self.body = $(document.body);
		self.ev = self.win;
		self.doc = $(document);
		
		// Initialize modules
		var modules = $.magnificPopup.modules;
		for(var i = 0; i < modules.length; i++) {
			modules[i].call(self);
		}
	}



	MagnificPopup.prototype = {

		constructor: MagnificPopup,

		/**
		 * Updates layout of popup
		 * @param  Boolean force     If set to true forces the resize, no matter if height is changed or not.
		 * @param  Number  winHeight Height of window (optional).
		 */
		resize: function(force, winHeight) {
			var self = this;
			self.wH = winHeight || self.win.height();

			// we resize only height
			if(force || self.prevHeight !== self.wH) {
				self.prevHeight = self.wH;
			
				if(self.wH < self.st.minHeight ) {
					self.wH = self.st.minHeight;
				} else {
					//self.wH -= 20;
				}

				var margin = self.st.vMargin;
				self.container.css({
					height: self.wH - margin*2,
					lineHeight: (self.wH - margin*2) + 'px',
					margin: margin + 'px 0'
				});

				if(self.currData.type === 'img')
					self.wrap.find('img').css('max-height', self.wH - margin*2);

				self.ev.trigger('mfpResize');
			}
		}, 
		
		open: function(data) {
			var self = this;
			
			if(!self.isOpen) {

				self.isOpen = true;
				self.currData = data;
				self.items = data.items;

				self.st = $.extend({}, $.fn.magnificPopup.defaults, data); 
				self.fixedPosition = self.st.fixedPosition === 'auto' ? self.supportsFixedPositon : self.st.fixedPosition;

				self.ev.trigger('mfpBeforeOpen');

				self.bgOverlay = self._getEl('bg');
				
				
				self.wrap = self._getEl('wrap');
				self.container = self._getEl('container', self.wrap);
				self.centerer = self._getEl('centerer', self.container);

				if(self.st.preloader) {
					self.preloader = self._getEl('preloader', self.centerer, self.st.txt.loading);
				}

				self.content = self._getEl('content', self.centerer);

				if(self.st.alignTop) {
					self.centerer.css('vertical-align', 'top');
				}

				if(!self.st.closeBtnInside) {
					self.wrap.append( self._getCloseBtn() );
				}
				

				if(self.fixedPosition) {
					self.wrap.css({
						overflow: self.st.overflow,
						overflowX: 'hidden',
						overflowY: self.st.overflow
					});
				} else {
					self.bgOverlay.css({
						height: self.doc.height(),
						position: 'absolute'
					});
					
					self.wrap.css({ 
						top: window.pageYOffset,
						position: 'absolute'
					});
				}




				self.win.on('resize.mfp', function() {
					self.resize();
				});

				self.doc.on('keyup.mfp', function(e) {
					if(e.keyCode === 27) {
						self.close();
					}
				});

				self.bgOverlay.on('click.mfp', function() {
					self.close();
				});


				if(self.st.closeOnContentClick) {
					self.wrap.addClass('mfp-zoom-out');
				}
				
				self.wrap.on('click.mfp', function(e) {
					if(self.st.closeOnContentClick) {
						self.close();
					} else {
						if( !$(e.target).closest('.mfp-content').length ) {
							self.close();
						}
					}
				});

				self.setItemHTML(data, false);
				

				
				// this triggers recalculation of layout, so we get it once
				 var winHeight = self.win.height(),
				 	 bodyClasses = '';

				if(self.st.mainClass)
				 	bodyClasses += self.st.mainClass;

				

				if(self.fixedPosition && self._hasScrollBar(winHeight) ) {
					var s = self._getScrollbarSize();
					if(s) {
						self.body.css('paddingRight', s);
					}
				}

				if(self.st.fixedPosition)
					self.body.addClass('mfp-overflow-hidden');

				self._addClassToMFP(bodyClasses);
				self.resize(true, winHeight);

				self.bgOverlay.add(self.wrap).appendTo( self.body );

				self.ev.trigger('mfpOpen');


				//for CSS3 animation
				setTimeout(function() {
					self._addClassToMFP('mfp-ready');
				}, 0);
				
			}

		},
		

		close: function(browserAction) {
			var self = this;

			if(self.isOpen) {
				self.isOpen = false;

				// for CSS3 animation
				if(self.st.removalDelay)  {
					self._addClassToMFP('mfp-removing');
				}

				setTimeout(function() {
					var classesToRemove = 'mfp-removing mfp-ready ';
					self.bgOverlay.remove();
					self.wrap.remove();
					self.closeBtn = null;
					self.currImg = null;

					if(self.st.mainClass)
						classesToRemove += self.st.mainClass + ' ';

					if(self.fixedPosition) {
						self.body.css('paddingRight', 'inherit').removeClass('mfp-overflow-hidden');
					}

					self._removeClassFromMFP(classesToRemove);


					self.win.off('resize.mfp');
					self.doc.off('keyup.mfp');

					self.prevHeight = 0;

					self.ev.trigger('mfpClose', self, browserAction);
				}, self.st.removalDelay || 0);
			}
		},

		
		// set content of popup
		setItemHTML: function(data,  resize) {
			var self = this,
				content,
				currContentClass;

			if(data.el) {	
				data = self.parseEl( data );
			}
			
			if(self.preloader) {
				if(self.currImg) {
					self.currImg.off('error.mfp');
					self.preloader.removeClass('mfp-img-load-error').html(self.st.txt.loading);
				}
			}
			currContentClass = 'mfp-'+data.type+'-content';
			switch(data.type) {
				case 'iframe':
					content = self.st.iframe
									.replace('%url%', data.url)
									.replace('%wid%', self.st.iframeWid)
									.replace('%hei%', self.st.iframeHei);
					break;
				case 'inline':
					content = $(data.url).clone().css('display', 'block');
					break;
				case 'img':
					content = $( self.st.img.replace('%maxheight%', self.wH-88).replace('%url%', data.url) );
					if(self.preloader) {
						self.currImg = ( content.is('img') ? content : content.find('img') ).on('error.mfp', function() {
							$(this).remove();
							self.preloader.addClass('mfp-img-load-error').html(self.st.txt.imageError);
						});
					}
					break;
			}
			
			//self._tContent = content;

			

			self.ev.trigger('mfpBeforeContentSet', data);
			self.currData = data;



			//var oldContent = self.content.children();
			// if(oldContent.length) {
			// 	content = $(content).css('display', 'none').appendTo( self.content );
			// 	setTimeout(function() {
			// 		content.css({
			// 			display: 'inline-block'
			// 		});
			// 		oldContent.remove();
			// 	}, 16);
			// } else {
				self.content.html( content ).addClass(currContentClass);
				
				//self.content.html( content );
			//}
				

			//if(resize)
			//	self.resize(true, self.wH);

			//

			if(self.st.closeBtnInside) {
				self.content.append( self._getCloseBtn() );
			}

			self.contentClass = currContentClass;

			
		},

		

		
		// converts DOM element to Magnific Popup data object
		parseEl: function(data) {
			var self = this,
				el = data.el;
			
			if(data.items) {
				data.index = data.items.index( el );
			}

			if(el.hasClass('mfp-iframe')) {
				data.url = el.attr('href');	
				data.type = 'iframe';
			} else if(el.hasClass('mfp-inline')) {
				data.url = el.attr('data-mfp-select');	
				data.type = 'inline';
				
			} else {
				data.url = el.attr('href');	
				data.type = 'img';
			}
			return data;
		},


		/**
		 * Initializes single or group of popups
		 * @param el      jQuery DOM element
		 * @param options MFP options
		 */
		addGroup: function(el, options) {
			var self = this,
				eHandler = function(e) {

					if(e.which !== 2) {

						if( $(window).width() > (options.disableOn !== undefined ? options.disableOn : $.fn.magnificPopup.defaults.disableOn ) ) {
							e.preventDefault();
							options.el = $(this);
					   		self.open( options );
						}

					}
					
				};

			if(!options) options = {};

			if(options.delegate) {
				options.items = el.find(options.delegate);
				el.off('click.mfp').on('click.mfp', options.delegate , eHandler);
			} else {
				options.items = el;
				el.off('click.mfp').on('click.mfp', eHandler);
			}
		},








		/*
			"Private" helpers
		 */
		_getCloseBtn: function() {
			var self = this;
			if(!self.closeBtn) {
				self.closeBtn = $( self.st.closeMarkup.replace('%title%', self.st.txt.close ) ).click(function(e) {
					e.preventDefault();
					self.close();
				});
			}
			
			return self.closeBtn;
		},
		_addClassToMFP: function(cName) {
			this.bgOverlay.addClass(cName);
			this.wrap.addClass(cName);
		},
		_removeClassFromMFP: function(cName) {
			this.bgOverlay.removeClass(cName);
			this.wrap.removeClass(cName);
		},
		_hasScrollBar: function(winHeight) {
			if(document.body.clientHeight > (winHeight || this.win.height()) ) {
                return true;    
            }
            return false;
		},
		_getEl: function(className, appendTo, html, raw) {
			var el = document.createElement('div');
			el.className = 'mfp-'+className;
			if(html) {
				el.innerHTML = html;
			}
			if(!raw) {
				el = $(el);
				if(appendTo) {
					el.appendTo(appendTo);
				}
			} else if(appendTo) {
				appendTo.appendChild(el);
			}
			return el;
		},
		_getScrollbarSize: function() {
			// from http://davidwalsh.name/detect-scrollbar-width
			if(this.scrollbarSize === undefined) {
				var scrollDiv = document.createElement("div");
				scrollDiv.id = "mfp-sbm";
				document.body.appendChild(scrollDiv);

				// Get the scrollbar width
				this.scrollbarSize = scrollDiv.offsetWidth - scrollDiv.clientWidth;

				// Delete the DIV 
				document.body.removeChild(scrollDiv);
			}
			return self.scrollbarSize;
		}

	}; /* MagnificPopup core prototype end */

	

	// TODO: add "global" public methods
	$.magnificPopup = {
		open: function(data) {
	
		},
		close: function() {
			$.mfpInstance.close();
		}
	};


	$.fn.magnificPopup = function(options) {
		if(!$.mfpInstance) {
			$.mfpInstance = new MagnificPopup();
		}
		return this.each(function(){
			$.mfpInstance.addGroup($(this), options);
			return $(this);
		});
	};


	$.magnificPopup.proto = MagnificPopup.prototype;
	$.magnificPopup.modules = [];


	$.fn.magnificPopup.defaults = {   
		mainClass: '',
		minHeight: 300,
		preloader: true,

		vMargin: 44, // Vertical margin for main wrap that holds popup content (top and bottom).

		gallery: false,
		disableOn: 700, // Conditional lightbox: property defines on what screen width in pixels should the lightbox be disabled. TODO: add option to pass function instead of number

		openOnMidClick: false, 	// if middle button clicked - we do nothing, to allow opening images in new window e.t.c
		closeOnContentClick: false,
		
		closeBtnInside: false,

		overlay: true,
	

		alignTop: false,
		
		fixedPosition: 'auto', // "auto", true, false. "Auto" will automatically disable this option when browser doesn't support fixed position properly.
		overflow: 'auto', // CSS property of slider wrap: 'auto', 'scroll', 'hidden'. Doesn't apply when fixedPosition is on.



		iframe: '<iframe class="mfp-video" width="%wid%" height="%hei%" src="%url%" frameborder="0" allowfullscreen></iframe>',
		iframeWid: 600,
		iframeHei: 400,
		img: '<img class="mfp-img" width="300" height="200" style="max-height:%maxheight%px" src="%url%" />',
			
		closeMarkup: '<button title="%title%" class="mfp-close"><i class="mfp-close-icn">&times;</i></button>',

		txt: {
			close: 'Close (Esc)',
			prev: 'Previous (Left arrow key)',
			next: 'Next (Right arrow key)',
			counter: '%curr% of %total%',
			loading: 'Loading...',
			imageError: 'Image was not loaded!<br/>Try to reopen popup.'
		}
		
	};


})(window.jQuery || window.Zepto, window);