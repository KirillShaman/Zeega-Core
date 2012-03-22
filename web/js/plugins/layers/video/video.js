(function(Layer){



	Layer.Video = Layer.Model.extend({
			
		layerType : 'Video',

		defaultAttributes : 
		{
			'title' : 'Video Layer',
			'url' : 'none',
			'left' : 0,
			'top' : 0,
			'height' : 100,
			'width' : 100,
			'volume' : 0.5,
			'in'  : 0,
			'out' : 0,
			'opacity':1,
			'dimension':1.5,
			'citation':true,
		},

		init : function()
		{
			console.log('video INIT')
			//load popcorn object
			this.video = new Plyr2({
				url : this.get('attr').attribution_url,
				id : this.id
			})
			console.log(this)
		}

	});
	
	Layer.Views.Controls.Video = Layer.Views.Controls.extend({
				
		render : function()
		{
			
			var playbackControls = new Layer.Views.Lib.Playback({
				model : this.model
			});
			
			var volumeSlider = new Layer.Views.Lib.Slider({
				property : 'volume',
				model: this.model,
				label : 'Volume',
				min : 0,
				max : 1,
				step : 0.01,
				css : false
			});
			
			var widthSlider = new Layer.Views.Lib.Slider({
				property : 'width',
				model: this.model,
				label : 'Width',
				suffix : '%',
				min : 1,
				max : 200,
			});
			
			var heightSlider = new Layer.Views.Lib.Slider({
				property : 'height',
				model: this.model,
				label : 'Height',
				suffix : '%',
				min : 1,
				max : 200,
			});
			
			var opacitySlider = new Layer.Views.Lib.Slider({
				property : 'opacity',
				model: this.model,
				label : 'Opacity',
				step : 0.01,
				min : .05,
				max : 1,
			});
			
			this.controls
				.append( playbackControls.getControl() )
				.append( volumeSlider.getControl() )
				.append( widthSlider.getControl() )
				.append( heightSlider.getControl() )
				.append( opacitySlider.getControl() );
			
			return this;
		
		}
	
	});

	Layer.Views.Visual.Video = Layer.Views.Visual.extend({
		
		draggable : true,
		linkable : true,
		
		render : function()
		{
			console.log(this.attr)
			var img = $('<img>')
				.attr('id', 'video-player-'+ this.model.id)
				.attr('src', this.attr.thumbnail_url)
				.css({'width':'100%'});

			$(this.el).html( img ).css('height', this.attr.height+'%');
			
			//this.model.trigger('ready',this.model.id)
			
			return this;
		},
		
		
		onLayerEnter : function()
		{
			//if coming from another frame and the controls are open but the video isn't loaded
			if( this.model.controls.visible == true )
			{
				this.$el.find('img').remove();
				this.model.video.placeVideo( this.$el );
				this.model.loaded = true;
			}
		},
		
		onLayerExit : function()
		{
			this.model.video.pop.pause();
			if( this.model.video.isVideoLoaded ) Popcorn.destroy(this.model.video.pop);
			this.model.loaded = false;
			
			//must call this if you extend onLayerExit
			this.model.trigger('editor_readyToRemove')
		},
		
		onControlsOpen : function()
		{
			console.log('video controls open : visual')
			
			if( !this.model.loaded )
			{
				this.model.video.placeVideo( this.$el );
				this.model.loaded = true;
			}
			else
			{
				this.model.video.pop.pause();
			}
			
			this.model.trigger('video_ready');
			//replace with the actual video object
		},
		
		onControlsClosed : function()
		{
			this.model.video.pop.pause();
		},
		
		onPreload : function()
		{
			var _this = this;
			if( !this.model.loaded )
			{
				this.model.video.placeVideo( this.$el );
				this.model.video.on('video_canPlay', function(){ _this.model.trigger('ready', _this.model.id ) }, this )
				this.model.loaded = true;
			}
			else
			{
				this.model.video.pop.pause();
			}
		},
		
		onPlay : function()
		{
			console.log('video playyyyyyyy')
			console.log(this)
			this.model.video.pop.play();
		},
		
		onExit : function()
		{
			console.log('video pauseeee')
			this.model.video.pop.pause();
		},
		
		onUnrender : function()
		{
			console.log('unrender VIDEO')
			
		}
		
	});
	
	Layer.Youtube = Layer.Video.extend();
	Layer.Views.Controls.Youtube = Layer.Views.Controls.Video.extend();
	Layer.Views.Visual.Youtube = Layer.Views.Visual.Video.extend();

})(zeega.module("layer"));