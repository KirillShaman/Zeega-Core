
/********************************************

	ZEEGA.JS 

	CORE APPLICATION OBJECT
	
	VERSION 1.0
	
	
*********************************************/

/********************************************

	THE Zeega object to end all objects

*********************************************/

var Zeega = {
	
	routeID : 1,
	currentNode : null,
	
	previewMode:false,
	
	helpCounter: 0,
	
	maxNodesPerRoute : 0, // 0 = no limit
	maxLayersPerNode : 0, // 0 = no limit
	
	url_prefix : "",
	
	url_hash : {
		'route' : null,
		'node' : null
	},
	
	//this function is called once all the js files are sucessfully loaded
	init : function()
	{

		// makes sure that zeega only advances after both nodes and layers are loaded
		//commented out??
		this.zeegaReady = _.after(2,this.nodesAndLayersReady);

		this.initStartHelp();

		Zeega.url_prefix = sessionStorage.getItem('hostname') + sessionStorage.getItem('directory');
	},
	
	
	//set the route without loading it
	//do we need this?
	setRoute : function(routeID)
	{
		this.routeID = routeID;
	},
	
	createRoute : function()
	{
		//make a new and empty route
		
		var newRoute = new Route();
		var _this = this;
		
		newRoute.save({},{
		
			success: function(route,response){
				_this.route = route;
				_this.routeID= route.id;
				_this.routeView = new RouteView({ model : z.route });
				_this.routeView.render();
				_this.loadFrames();
				_this.loadLayers();
			
				console.log('new route created with id: '+ route.id);
			},
			error: function(){
				console.log('error');
			}
		
		
		});
		
	},
	
	//set and load a new route
	//this is the first function called when loading the editor in dev
	loadProject : function()
	{
		var _this = this;
		this.projectID =  $('#project-id').val();
		this.project = new Project({ 'id' : this.projectID });
		this.project.fetch({
			success: function(project)
			{
				_this.projectView = new ProjectView({ model : _this.project });
				_this.projectView.render();
				if( project.get('attr').ratio ) changeAspectRatio( project.get('attr').ratio )
			}
		});
	},
	loadRoute : function(routeID)
	{
		
		var _this = this;
		this.routeID = routeID;
		this.route = new Route({ 'id' : this.routeID });
		this.route.fetch({
			success: function(route, response)
			{
				_this.loadFrames();
				_this.loadLayers();
				_this.loadProject();
			}
		});
		

	},
	
	loadFrames : function()
	{
		var _this = this;
		//create a node collection inside the route model
		this.route.nodes = new NodeCollection;
		//get all existing nodes

		this.route.nodes.fetch({
			success : function(frames,response)
			{
				console.log('frames')
				console.log(frames)
				//make a node view collection
				_this.route.nodeViewCollection = new NodeViewCollection({ collection : frames });
				//render everything in the nodeViewCollection
				_this.route.nodeViewCollection.render();
				_this.zeegaReady();
			}
		});
	},
	
	loadLayers : function()
	{
		var _this = this;
		//create a layer collection inside the route model
		this.route.layerCollection = new LayerCollection;
		//get all existing layers
		this.route.layerCollection.fetch({
			
			success : function(layers)
			{
				console.log('layers')
				console.log(layers)
				_this.route.layerCollection.parseLayers();
				_this.zeegaReady();
			}
		});
	},
	
	nodesAndLayersReady : function()
	{
		this.currentNode = this.route.nodes.at(0);
		console.log('ready')
		console.log(this)
		//if no nodes exist, create one
		if( _.size(this.route.nodes) == 0 )
		{
			console.log('no frames. MAKE ONE!')
			var newNode = new Node;
			this.route.nodeViewCollection.add(newNode);
			this.loadNode( newNode );
		}else if(this.url_hash.node){
			this.loadNode( this.route.nodes.get(this.url_hash.node) );
		}else{
			this.loadNode( this.route.nodes.at(0) );
		}
		
		this.nodeSort();
		
	},
	
	loadNode : function( node )
	{
		var _this = this;
		
		this.clearCurrentNode();
		
		//set global currentNode to the selected node
		this.currentNode = node;

		if(node) window.location.hash = '/editor/frame/'+ node.id; //change location hash
		else window.location.hash = 'newNode';
		//open/close visual editor
		var el = $('#workspace');


		//show/hide editor panels
		// what should happen to panels which haven't been set?
		//right now they inherit the last node's state
		
		
		var storage = localStorage.getObject( this.currentNode.id );
		if( !_.isNull( storage ) && !_.isUndefined( storage.panelStates ) )
		{
			//go through each saved state
			_.each( storage.panelStates , function(closed, panel){
				var dom = $( '#' +panel+ '-view-bar' );
				var expander = $(dom).next('div');
				if( closed && expander.is(':visible') )
				{
					expander.hide('blind',{'direction':'vertical'});
					$(dom).find('.expander').removeClass('zicon-collapse').addClass('zicon-expand');
				}else if( !closed && expander.is(':hidden') ){
					expander.show('blind',{'direction':'vertical'});
					$(dom).find('.expander').addClass('zicon-collapse').removeClass('zicon-expand');
				}
			})
		}
		
		
		//update the auto advance tray
		//make sure the attribute exists
		var adv = false;
		if( !_.isNull(this.currentNode.get('attr')) && !_.isNull( this.currentNode.get('attr').advance ) )
			adv = this.currentNode.get('attr').advance;
			
		var advanceControls = $('#advance-controls');

		if(adv > 0)
		{
			//after time in seconds
			advanceControls.find('input[id="time"]').prop('checked', true );
			advanceControls.find('input[id="manual"]').prop('checked', false );
			advanceControls.find('input[id="playback"]').prop('checked', false );
			$('#advance-time').val(adv);
		}else if( adv == -1 ){
			//manual

			advanceControls.find('input[id="time"]').prop('checked', false );
			advanceControls.find('input[id="manual"]').prop('checked', true );
			advanceControls.find('input[id="playback"]').prop('checked', false );

			$('#advance-time').val(10);
		
		//if the attr doesn't exist, then give it default values
		}else if( !adv ){
			advanceControls.find('input[id="time"]').prop('checked', false );
			advanceControls.find('input[id="manual"]').prop('checked', false );
			advanceControls.find('input[id="playback"]').prop('checked', true );
			$('#advance-time').val(10);
		}
		
		// add the node's layers // remove falsy values
		var layerArray = _.compact( this.currentNode.get('layers'));
		
		//call render on the entire collection. it should have the logic to draw what's needed
		Zeega.route.layerCollection.render( this.currentNode );
		
		//add a new current node style
		$('#frame-thumb-'+this.currentNode.id).addClass('active-frame');
	},
	
	clearCurrentNode : function ()
	{
		//remove a prexisiting node style
		if(this.currentNode) $('#frame-thumb-'+this.currentNode.id).removeClass('active-frame');
		
		//clear out existing stuff in icon trays
		$('.icon-tray').empty();

		//clear the workspaces
		//$('#visual-editor-workspace').empty();
		//$('#layers-list-interaction').empty();
		
	},
	
	addNode : function()
	{
		this.route.nodes.add(new Node);
	},
	
	addToLayerCollections : function(node,layer)
	{

		//only add to the layers collection if it's not already there!
		if( !this.route.layerCollection.get(layer.id) )
		{
			console.log('not in collection');
			
			//this.route.layerCollection.add( layer );
			
			//Add to the collection do update stuff if it's the current layer (like show the item in the visual editor)
			if(node == this.currentNode)
			{
				console.log('layer should be added to the editor window')
				this.route.layerCollection.add( layer );
			}else{
				console.log('layer should not be drawn')
				//if it's not the current node, then be quiet about it
				//this.route.layerCollection.add( layer , {silent:true} ); // do I need this??
				//we still need to add it to the type collection though
				this.route.layerCollection.add( layer, {silent:true} );
			 	this.route.layerCollection.addToLayerTypeCollection( layer, false );
			}
		}

	},
	
	addLayerToNode : function( node, layer )
	{

		//reject if there are too many layers inside the node
		if( !node.get('layers') || node.get('layers').length < this.maxLayersPerNode || this.maxLayersPerNode == 0)
		{
			var _this = this;
			
			//add URL to layer model
			layer.url = Zeega.url_prefix + 'routes/'+ Zeega.routeID +'/layers';
		
			//check to see if the layer is saved or not. save if ndeeded
			if( layer.isNew() )
			{
				console.log('this is a new layer');
				console.log(layer)
				layer.save(
					{},
					{
						success : function(savedLayer, response){
							console.log(response)
							savedLayer.url = _this.url_prefix + "layers/" + savedLayer.id
							_this.updateAndSaveNodeLayer(node,savedLayer);
							_this.addToLayerCollections(node, savedLayer);
							if( savedLayer.layerClass.thumbUpdate ) node.noteChange() ;
						}
					});
				//save the new layer then prepend the layer id into the node layers array
			}else{
				console.log('this is an old layer');
				//prepend the layer id into the node layers array
				this.updateAndSaveNodeLayer(node,layer);
				console.log(layer.layerClass.thumbUpdate)
				if( layer.layerClass.thumbUpdate ) node.noteChange() ;
			}
		}
	},
	
	//frame arg is optional. Defaults to currentNode if not set.
	createLayerFromItem : function( item, frame )
	{
		if( _.isUndefined(frame)) frame = this.currentNode;
		var newLayer = new Layer({
			type: Zeega.draggedItem.get('source'),
			attr: {
				'item_id' : item.id,
				'title' : item.get('title'),
				'url' : item.get('uri'),
				'uri' : item.get('uri'),
				'thumbnail_url' : item.get('thumbnail_url'),
				'attribution_url' : item.get('attribution_uri'),
				'citation':true,
			}
		});

		this.addLayerToNode( frame, newLayer );
	},
	
	updateAndSaveNodeLayer : function(node, layer)
	{
		console.log('updateAndSaveNodeLayer');
		var layerOrder = [parseInt(layer.id)];
		if( node.get('layers') )
		{
			//if the layer array already exists eliminate false values if they exist
			layerOrder = _.compact( node.get('layers') );
			//add the layer id to the layer order array
			layerOrder.push( parseInt( layer.id ) );
		}
		//set the layerOrder array inside the node
		node.set({'layers':layerOrder});
		node.save();
	},
	
	removeLayerFromNode : function( node, layer )
	{
		//remove from node.layer and save it back
		//remove icon from tray
		$('.'+layer.get('type').toLowerCase()+'-tray-icon').remove();
		
	
		//test to see if the layer is a persisting layer and destroy it from all nodes if so
		//var routeAttributes = this.route.get('attr');
		
		if( _.include( this.route.get('attr').persistLayers , layer.id ) )
		{
			console.log('a persistent layer');
			
			
			this.removeLayerPersist(layer)
			_.each( _.toArray(this.route.nodes), function(_node){
				var layerOrder = _node.get('layers');
				layerOrder = _.without(layerOrder, parseInt(layer.id) );
				if(layerOrder.length == 0) layerOrder = [false];
				_node.set({'layers':layerOrder});
				_node.save();
				_node.updateThumb();
			});
			
			
		}else{
			console.log('NOT a persistent layer');
			
			var layerOrder = node.get('layers');
			layerOrder = _.without(layerOrder, parseInt(layer.id) );
			//set array to false if empty  //weirdness
			if(layerOrder.length == 0) layerOrder = [false]; //can't save an empty array so I put false instead. use _.compact() to remove it later
			node.set({'layers':layerOrder});
			node.save();
			node.updateThumb();
			
		}
		
		this.destroyOrphans();
		
	},
	
	destroyOrphans : function()
	{
		console.log('destroyOrphans');
		_this = this;
		// make a giant array of all the layer IDs in use by nodes
		var layersInNodes = [];
		
		_.each( _.toArray(this.route.nodes), function(node){
			layersInNodes = _.union(node.get('layers'), layersInNodes);
		});
		
		layersInNodes = _.compact(layersInNodes); //remove falsy values needed to save 'empty' arrays
				
		// make a giant array of all the layer IDs saved in the route
		var layersInRoute = [];
		_.each( _.toArray(this.route.layerCollection), function(layer){
			layersInRoute.push( parseInt(layer.id) );
		});

		var orphanIDs = _.difference(layersInRoute, layersInNodes);
		
		if(orphanIDs)
		{

			_.each(orphanIDs, function(orphanID){
				//removes and destroys the orphan
				var orphan = _this.route.layerCollection.get(orphanID);
				_this.removeLayerPersist(orphan);
			
				//remove from the layer collection
				_this.route.layerCollection.remove(orphan)
				
				orphan.destroy();
			})
		}else{
			return false;
		}
		
		
	},
	
	copyLayerToNextNode : function(layer)
	{
		console.log('copy to next layer');
		var nextNode = this.getRightNode();
		if (nextNode) this.addLayerToNode(nextNode,layer);
	},
	
	persistLayerOverNodes : function(layer)
	{
		console.log('peristing');
		//function(layer,[nodes])
		//eventually you should pass in an array of node IDs and only add to those nodes
		//for now we persist to all nodes EXCEPT the currentNode

		_.each( _.toArray(this.route.nodes), function(node){
			if(node != Zeega.currentNode)
			{
				//test to see if it exists in any of the target nodes. If so, DO NOT add
				var layerArray = _.toArray( node.get('layers') );
				if( ! _.include(layerArray,layer.id) ) Zeega.addLayerToNode(node, layer);
			}
		});
		
		//add to the route persistLayers array
		var attr = this.route.get('attr');
		
		//if the array exists and the layer isn't already inside it
		if( attr.persistLayers && !_.include( _.toArray(attr.persistLayers),layer.id) )
		{
			attr.persistLayers.push(layer.id);
			attr.persistLayers = _.uniq(attr.persistLayers);
			console.log('new layer persisting')
			this.route.set({'attr': attr});
			this.route.save();
			
		//if the array doesn't exist
		}else{
			
			attr.persistLayers = [layer.id];
			this.route.set({'attr':attr});
			this.route.save();
		}
		
	},
	
	removeLayerPersist : function(layer)
	{
		console.log('remove persistance!');
		//removes layers from the route layerPersist array
		//does not affect existing layers or nodes
		//future nodes will not have the persisting layers
		var attr = this.route.get('attr');
		attr.persistLayers = _.without( attr.persistLayers, layer.id );
		this.route.set({'attr':attr});
		this.route.save();
		
		
	},
	
	updateLayerOrder : function(layerIDs)
	{
		console.log('updateLayerOrder');
		layerIDs = layerIDs.reverse();
		// updates z-index of divs in workspace
		_.each(layerIDs, function(id, i){ $('#layer-preview-'+ id ).css('z-index', i) });
		console.log(layerIDs)

		//update the layerOrder array 
		this.currentNode.set({'layers':layerIDs})
		this.currentNode.save();

		//update node thumb
		this.currentNode.updateThumb();

	},
	
	destroyNode : function( view )
	{
		
		view.model.destroy();
		view.remove();
		this.loadLeftNode();
		
		//remove from Sequence Order
		this.removeFromSequence( view.model );
		
		//if the sequence is empty(false), then make a new frame
		if( this.getSequenceOrder()[0] === false )
		{
			var newNode = new Node;
			Zeega.route.nodeViewCollection.add(newNode);
			Zeega.loadNode( newNode );
		}
		
		this.nodeSort();
		this.destroyOrphans();
	},
	
	// returns the order that the frame appears in the sequence
	getFrameIndex : function( frame )
	{
		if( _.isNumber( frame ) ) frameId = frame;				//tests if it's a number id
		else if( _.isString( frame ) ) frameId = parseInt(frame);		//tests if it's a string id
		else if( _.isNumber( frame.id ) ) frameId = frame.id;	//assumes it must be a model
		else return false;

		return _.indexOf( this.route.get('nodesOrder') , frameId );
	},
	
	getSequenceOrder : function(){ return this.route.get('nodesOrder') },
	
	removeFromSequence : function( frame )
	{
		//test to see if it's actually in the sequence first
		if( this.getFrameIndex(frame) === false ) return false;
		else
		{
			var frameId;
			if( _.isNumber( frame ) ) frameId = frame;
			else if( _.isString( frame ) ) frameId = parseInt(frame);
			else if( _.isNumber( frame.id ) ) frameId = frame.id;
			else return false;
			
			var newOrder = _.without( this.route.get('nodesOrder') , frameId );
			if( _.size(newOrder) == 0 ) newOrder.push(false);
			this.route.set({ nodesOrder:newOrder });
			return frameId;
		}
		
	},
	
	
	duplicateFrame : function( view )
	{
		var dupeModel = new Node({'duplicate_id':view.model.id,'thumb_url':view.model.get('thumb_url')});
		dupeModel.oldLayerIDs = view.model.get('layers');
		
		dupeModel.dupe = true;
		dupeModel.frameIndex = _.indexOf( this.route.get('nodesOrder'), view.model.id );
		this.route.nodes.add( dupeModel );
	},
		
	nodeSort : function()
	{
		//turn the string IDs into integers to compare with model IDs
		var order = _.map( $('#frame-list').sortable('toArray'), function(num){ return parseInt( num.match( /[0-9 - ()+]+$/ )[0] ) })
		
		//var order = _.map( $('#frame-list').sortable('toArray'), function(str){ return parseInt(str) });
		this.route.set({'nodesOrder': order});
		console.log(this.route.get('nodesOrder'))
		this.route.save();
	},
	
	previewRoute : function()
	{
		this.previewMode = true;
		//remove branch viewer if present

		Player.init( this.exportProject(), this.route.id, this.currentNode.id );
	
	},
	
	exportProject : function( string )
	{
		console.log('export');
		
		var order = _.map( this.route.get('nodesOrder'), function(num){ return parseInt(num) });
		var routes = [{
			'id' : this.route.id,
			'nodeOrder' : order,
			'nodes' : this.route.nodes.toJSON(),
			'layers' : this.route.layerCollection.toJSON() //$.parseJSON( JSON.stringify(this.route.layers) )
		}];
		
		var project = {
			'id' : this.project.id,
			'title' : this.project.get('title'),
			'routes' : routes
		};
		
		var exportObject = { 'project' : project };
		
		console.log(exportObject)
		
		if(string) return JSON.stringify(exportObject);
		else return exportObject;
	},	
	
	getLeftNode : function()
	{
		var nodeOrder = this.route.get('nodesOrder');
		var currentNodeIndex = _.indexOf( nodeOrder,this.currentNode.id );
		if( currentNodeIndex ) return this.route.nodes.get( nodeOrder[ currentNodeIndex-1 ] );
		else return this.route.nodes.get( nodeOrder[1] );
	},
	
	getRightNode : function()
	{
		var currentNodeIndex = _.indexOf( this.route.get('nodesOrder'), this.currentNode.id );
		if(currentNodeIndex < _.size( this.route.nodes )-1 ) return this.route.nodes.at( currentNodeIndex + 1 );
		else return false;
	},
	
	loadLeftNode : function()
	{
		console.log('loading left node')
		var node = this.getLeftNode();
		if(node) this.loadNode(node)
	},
	
	loadRightNode : function()
	{
		var node = this.getRightNode();
		console.log(node);
		
		if(node) this.loadNode(node)
	},
	
	udpateAspectRatio : function( ratioID )
	{
		console.log('changeAspectRatio to: '+ ratioID)
		console.log(this.project)
		this.project.set({'attr':{'ratio':ratioID}});
		this.project.save();
	},
	
	initStartHelp : function()
	{
		if(localStorage.help != 'false' && this.helpCounter == 0)
		{
			//init the popovers
			$('#visual-editor-workspace').popover({
				trigger: manual,
				html:true,
				placement:'above',
				offset:'-250',
				template: '<div class="inner help"><h3 class="title"></h3><div class="content"><p></p></div><div class="help-controls"><a href="#" onclick="Zeega.turnOffHelp();return false">close</a><a class="btn success" href="#" onClick="Zeega.displayStartHelp();return false;">next</a></div></div>'
			});
			$('#database-panel').popover({
				trigger: manual,
				html:true,
				placement:'right',
				//offset:'-250',
				template: '<div class="arrow"></div><div class="inner help"><h3 class="title"></h3><div class="content"><p></p></div><div class="help-controls"><a href="#" onclick="Zeega.turnOffHelp();return false">close</a><a class="btn success" href="#" onClick="Zeega.displayStartHelp();return false;">next</a></div></div>'
			});
			$('#new-layer-tray').popover({
				trigger: manual,
				html:true,
				placement:'above',
				template: '<div class="arrow"></div><div class="inner help"><h3 class="title"></h3><div class="content"><p></p></div><div class="help-controls"><a href="#" onclick="Zeega.turnOffHelp();return false">close</a><a class="btn success" href="#" onClick="Zeega.displayStartHelp();return false;">next</a></div></div>'
			});
			$('#layer-panel').popover({
				trigger: manual,
				html:true,
				placement:'above',
				template: '<div class="arrow"></div><div class="inner help"><h3 class="title"></h3><div class="content"><p></p></div><div class="help-controls"><a href="#" onclick="Zeega.turnOffHelp();return false">close</a><a class="btn success" href="#" onClick="Zeega.displayStartHelp();return false;">next</a></div></div>'
			});
			$('#frame-drawer').popover({
				trigger: manual,
				html:true,
				placement:'below',
				template: '<div class="arrow"></div><div class="inner help"><h3 class="title"></h3><div class="content"><p></p></div><div class="help-controls"><a href="#" onclick="Zeega.turnOffHelp();return false">close</a><a class="btn success" href="#" onClick="Zeega.displayStartHelp();return false;">next</a></div></div>'
			});
			$('#preview').popover({
				trigger: manual,
				html:true,
				placement:'below',
				template: '<div class="arrow"></div><div class="inner help"><h3 class="title"></h3><div class="content"><p></p></div><div class="help-controls"><a href="#" onclick="Zeega.turnOffHelp();return false">close</a><a class="btn success" href="#" onClick="Zeega.displayStartHelp();return false;">next</a></div></div>'
			});

			this.displayStartHelp();
		}
	},
	
	displayStartHelp : function()
	{
		var _this = this;
		var helpOrderArray = [
			'visual-editor-workspace',
			'database-panel',
			'new-layer-tray',
			'layer-panel',
			'frame-drawer',
			'preview'
		];
		
	
		if(_this.helpCounter > 0 )
		{
			$('#'+helpOrderArray[_this.helpCounter-1]).popover('hide');
			$('#'+helpOrderArray[_this.helpCounter-1]).css('box-shadow', '');
		}
		if(_this.helpCounter >= helpOrderArray.length )
		{
			console.log('end of line')
			$('#'+helpOrderArray[_this.helpCounter-1]).css('box-shadow', '');
			this.turnOffHelp();
			return false;
		}
			
		$('#'+helpOrderArray[_this.helpCounter]).popover('show');
		$('#'+helpOrderArray[_this.helpCounter]).css('box-shadow', '0 0 18px orange');
	
		this.helpCounter++;
		
	},
	
	turnOffHelp : function()
	{
		console.log('turn off help windows')
		var helpOrderArray = [
			'visual-editor-workspace',
			'database-panel',
			'new-layer-tray',
			'layer-panel',
			'frame-drawer',
			'preview'
		];
		localStorage.help = false;

console.log( helpOrderArray[this.helpCounter-1] )

			$('#'+helpOrderArray[this.helpCounter-1]).popover('hide');
			$('#'+helpOrderArray[this.helpCounter-1]).css('box-shadow', '');
			this.helpCounter = 0;
		
	}
	
	
	
	
};