/*
#ignore(Uint8Array)
*/

qx.Class.define("desk.segTools",
{
  extend : qx.ui.window.Window,

	construct : function(master, globalFile, globalFileBrowser)
	{	
		this.base(arguments);

        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }

    ////Global variables ?

		this.__master = master;

		this.__file = globalFile;

		this.__fileBrowser = globalFileBrowser;

	//// Set window
		this.setLayout(new qx.ui.layout.VBox());
		this.set({
								showMinimize: false,
								showMaximize: false,
								allowMaximize: false,
								showClose: true,
								resizable: false,
								movable : true
							});
		
	//// Fill window with the tools widgets

		this.__buildRightContainer();


		var _this=this;
		master.applyToViewers( function (sliceView) {
			sliceView.addListener("changeSlice", function ( event ) {
				_this.__saveCurrentSeeds();
				_this.__reloadSeedImage( sliceView );
			});
		});

		this.open();
	//// Return the tools window aka : this
		return (this);

	},

	statics : {
		filePrefixes : ["seed","correction"],
		seedsListsString : "seedsLists",
		seedsArrayString : "seedsArray",
		cacheTagsArrayString : "cacheTagsArray"
	},

	events : {
	},

	properties : {
		sessionDirectory : { init : null, event : "changeSessionDirectory"},
		seedsType : { init : 0, check: "Number", event : "changeSeedsType"}
	},

	members :
	{
		__master : null,
		__file : null,
		__fileBrowser : null,

		__topRightContainer : null,
		__bottomRightContainer : null,
		__mainBottomRightContainer : null,
		
		
		__curView : null, // en attendant...
		
		__seedsTypeSelectBox : null,
		
		__startSegmentationButton : null,

// Tableau contenant les couleurs des seeds
         __labelColors : null,

// type arrays containing seeds colors (for speed processing)
         __labelColorsRed : null,
         __labelColorsGreen : null,
         __labelColorsBlue : null,
		
         
         __eraserCoeff : 2,     //Taille gomme  =  eraserCoeff * taille crayon --> c'est plus agréable d'effacer comme ça
         
         
         __eraserCursorZ : 123000000,     //Indice de position en z du widget qui représente la gomme (toujours devant)
		
		__penSize : null,
		__eraserButton : null,
		__eraserCursor : null,

		// width of the panel measured manually during debug
		//~ __rightPanelWidth : 405 + 16 + 4,
		__rightPanelWidth : 405,
		
		__settingButtons : false,

		__reloadSeedImage : function (sliceView) {
			if (this.getSessionDirectory()==null)
				return;
			var _this=this;
			var canvas=sliceView.getDrawingCanvas();
			var width=canvas.getCanvasWidth()
			var height=canvas.getCanvasHeight()

			var context=canvas.getContext2d();
			context.clearRect(0, 0, width, height);
			var seedsType=_this.getSeedsType();
			var seedsList=sliceView.getUserData(desk.segTools.seedsListsString)[seedsType];
			var seedsArray=seedsList.getUserData(desk.segTools.seedsArrayString);
			var cacheTagsArray=seedsList.getUserData(desk.segTools.cacheTagsArrayString);
			var sliceId=sliceView.getSlice();

			if (seedsArray[sliceId]!=0) {
				var imageLoader= new Image();
				seedsList.setSelection([seedsArray[sliceId]]);
				imageLoader.onload=function(){
					context.drawImage(imageLoader, 0, 0);
					sliceView.fireEvent("changeDrawing");
					imageLoader.onload=0;
				}
				imageLoader.src=_this.__fileBrowser.getFileURL(_this.getSessionDirectory())+"/"+
								_this.__getSeedFileName ( sliceView, sliceId, seedsType)+"?nocache="+
								cacheTagsArray[sliceId];
			}
			else {
				seedsList.resetSelection();
				sliceView.fireEvent("changeDrawing");
			}
		},

		__buildRightContainer : function()
		{	
			var tools = this;
			
			var theMaster = tools.__master;
			
			var volFile = tools.__file;
			
			var fileBrowser = tools.__fileBrowser;
			
			
			var spacing=5;
			
			var tRCL=new qx.ui.layout.HBox();
			tRCL.setSpacing(spacing);
			tools.__topRightContainer = new qx.ui.container.Composite(tRCL);

			var bRCL=new qx.ui.layout.HBox();
			bRCL.setSpacing(spacing);
			tools.__bottomRightContainer= new qx.ui.container.Composite(bRCL);

		////Create pen size chose widget
            tools.__penSize = new qx.ui.form.Spinner().set({
                minimum: 1,
                maximum: 100,
                value: 1//tools.__curView.__drawingCanvasParams.myLineWidth
            });
			
            this.__penSize.addListener("changeValue", function(event)
			{
					this.__master.applyToViewers(function (viewer) {
						viewer.setPaintWidth(event.getData());
					});
				}, this);
            this.__penSize.setValue(5);
			
			var penLabel = new qx.ui.basic.Label("Brush : ");
			this.__topRightContainer.add(penLabel);
			this.__topRightContainer.add(tools.__penSize);
			
		////Create eraser on/off button
            tools.__eraserButton = new qx.ui.form.ToggleButton("Eraser");
			
			tools.__eraserButton.addListener("changeValue", function(event)
			{
				this.__master.applyToViewers(function (viewer) {
					viewer.setEraseMode(event.getData());
					});
				}, this);

			tools.__topRightContainer.add(tools.__eraserButton);

			
			
		////Create labels zone
			var paintPage = new qx.ui.tabview.Page("paint");
			var paintPageLayout=new qx.ui.layout.VBox();
			paintPageLayout.setSpacing(5);
            paintPage.setLayout(paintPageLayout);
			paintPage.add(tools.__topRightContainer);

			tools.__colorsContainer=new qx.ui.container.Composite();
            tools.__colorsContainer.setLayout(new qx.ui.layout.Grid(1,1));
			paintPage.add(tools.__colorsContainer);

			var bRCL=new qx.ui.layout.HBox();  //~ resizing
			bRCL.setSpacing(spacing);  //~ resizing
			tools.__mainBottomRightContainer = new qx.ui.container.Composite(bRCL);  //~ resizing
			
			var tabView = new qx.ui.tabview.TabView();
			tools.__tabView=tabView;
            tabView.add(paintPage);
			tabView.setVisibility("excluded");

			var sessionWdgt = tools.__getSessionsWidget();
			this.__addSeedsListsToViews();
			this.add(sessionWdgt);
			
			this.add(tools.__mainBottomRightContainer, {flex : 1}); //~ resizing

			tools.__mainBottomRightContainer.add(tabView); //~ resizing
			
		////Function creates one label box
			var unfocusedBorder = new qx.ui.decoration.Single(2, "solid", "black");
            var focusedBorder = new qx.ui.decoration.Single(3, "solid", "red");
			var boxWidth = 37;
			var columnLimit = 4;
			var colorCount = 4;
			var nbLines = 1;
			var createToolBox = function(inLabel)
            {
                var labelLayout = new qx.ui.layout.VBox();
                labelLayout.setSpacing(4);
				var labelBox = new qx.ui.container.Composite().set({
                    layout : labelLayout,
                    allowGrowX: false,
                    allowGrowY: false,
                    width: boxWidth,
                    height: 53,
                    decorator: unfocusedBorder,
                    backgroundColor: "background-light",
                    focusable : true
                });
				var colorBox = new qx.ui.container.Composite().set({
                    maxWidth: boxWidth-12,
                    height: 25,
                    alignX : "center",
					backgroundColor: inLabel.color
                });
				labelBox.addListener("click", function()
				{
					var viewers=theMaster.getViewers();

					var j = 0;
					var children = tools.__colorsContainer.getChildren();
					var paint;
					while(children[j]!=this)
					{
						j++;
					}
					if(!(children[j].getBackgroundColor()=="white"))//&&(tools.__curView.__mouseActionMode!=4)))
					{
						children[j].set({decorator: focusedBorder, backgroundColor: "white"});
						for(var k=0; k<nbLabels; k++)
						{
							if(k!=j)
							{
								children[k].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
							}
						}
						paint=true;
					}
					else
					{
						children[j].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
						paint=false
					}

					tools.__master.applyToViewers( function (viewer) {
						viewer.setPaintColor(colorBox.getBackgroundColor());
						viewer.setPaintMode(paint);
						});
					tools.__colorsContainer.set({opacity: 1});
                });
				var boxLabel = new qx.ui.basic.Label("\\" + inLabel.id + " : " + inLabel.name).set({alignX:"left"});
				labelBox.add(boxLabel);
				labelBox.add(colorBox);
				if(inLabel.id<=colorCount)
				{
					tools.__colorsContainer.add(labelBox, {column: inLabel.id-(nbLines-1)*columnLimit, row: (nbLines-1)});
				}
				else
				{
					nbLines++;
					tools.__colorsContainer.add(labelBox, {column: inLabel.id-(nbLines-1)*columnLimit, row: (nbLines-1)});
					colorCount += columnLimit;
				}
				var tempColors = tools.__colorsContainer._getChildren();
				if((boxWidth<boxLabel.getSizeHint().width+8)&&(0<tempColors.length))
				{
					boxWidth = boxLabel.getSizeHint().width + 16;	//// value returned by getSizeHint() is not enough
					for(var i=0; i<tempColors.length; i++)
					{
						tempColors[i].set({width:boxWidth});
						tempColors[i]._getChildren()[1].set({maxWidth:boxWidth-12});
					}
				}
            };
			
		////Fill labels zone width data from the xml file
			var nbLabels = 0;
			var colorsParamRequest = new XMLHttpRequest();
			colorsParamRequest.onreadystatechange = function()
			{
				 if(this.readyState == 4 && this.status == 200)
				 {
					// so far so good
					if(this.responseXML!=null)
					{
						var response = this.responseXML;
						nbLabels = response.getElementsByTagName("color").length;
						tools.__labelColors=new Array(nbLabels);
						tools.__labelColorsRed=new Uint8Array (nbLabels);
						tools.__labelColorsGreen=new Uint8Array (nbLabels);
						tools.__labelColorsBlue=new Uint8Array (nbLabels);
						for(var i=0; i<nbLabels; i++)
						{
							var color=response.getElementsByTagName("color")[i];
							var label=parseInt(color.getAttribute("label"),10)
							var colorName=color.getAttribute("name");
							tools.__labelColors[i] = {
								red : color.getAttribute("red"),
								green : color.getAttribute("green"),
								blue : color.getAttribute("blue"),
								label : ""+label,
								name : colorName
							};

							tools.__labelColorsRed[i]=tools.__labelColors[i].red;
							tools.__labelColorsGreen[i]=tools.__labelColors[i].green;
							tools.__labelColorsBlue[i]=tools.__labelColors[i].blue;

							var newLabel = {
								id : label,
								name : colorName,
								color : "rgb(" + tools.__labelColors[i].red + "," + tools.__labelColors[i].green + "," + tools.__labelColors[i].blue + ")"
							};
							newLabel.name = newLabel.name.replace(newLabel.name.charAt(0), newLabel.name.charAt(0).toUpperCase());
							createToolBox(newLabel);
						}
						var viewers=theMaster.getViewers();
						var lutRed= new Uint8Array(256);
						var lutGreen= new Uint8Array(256);
						var lutBlue= new Uint8Array(256);
						for(var j=0; j<tools.__labelColors.length; j++)
							{
								lutRed[j] = tools.__labelColors[j].red;
								lutGreen[j] = tools.__labelColors[j].green;
								lutBlue[j] = tools.__labelColors[j].blue;
							}
					}
					else
						alert("Global Params : Failure...");
				}
				else if (this.readyState == 4 && this.status != 200)
				{
					// fetched the wrong page or network error...
					alert('Global Params : "Fetched the wrong page" OR "Network error"');
				}
			};
			//~ colorsParamRequest.open("GET", "/visu/colorsKnee.xml?nocache="+Math.random(), true);
			colorsParamRequest.open("GET", "/visu/colors7.xml?nocache="+Math.random(), true);
			colorsParamRequest.send(null);

			var whileDrawingDrwngOpacityLabel = new qx.ui.basic.Label("Opacity :");
			tools.__topRightContainer.add(whileDrawingDrwngOpacityLabel);
			
            var whileDrawingDrwngOpacitySlider = new qx.ui.form.Slider();
			whileDrawingDrwngOpacitySlider.setValue(100);
			whileDrawingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
				this.__master.applyToViewers(function (viewer) {
					viewer.setPaintOpacity(event.getData()/100);
					});
			},this);

            this.__topRightContainer.add(whileDrawingDrwngOpacitySlider, {flex : 1});

			paintPage.add(this.__bottomRightContainer);

			var clusteringPage = new qx.ui.tabview.Page("clustering");
            clusteringPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(clusteringPage);
			var clusteringAction=new desk.action("cvtseg2", false);
			clusteringAction.setActionParameters(
				{"input_volume" : volFile});

			clusteringAction.setOutputSubdirectory("clustering");
			
			clusteringAction.buildUI();
			clusteringPage.add(clusteringAction);

			var segmentationPage = new qx.ui.tabview.Page("segmentation");
            segmentationPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(segmentationPage);
			var segmentationAction=new desk.action("cvtgcmultiseg", false);
			clusteringAction.setActionParameters({
				"input_volume" : volFile});

			segmentationAction.setOutputSubdirectory("segmentation");
			segmentationAction.connect("clustering", clusteringAction, "clustering-index.mhd");

			segmentationAction.buildUI();
			segmentationPage.add(segmentationAction);

			var medianFilteringPage = new qx.ui.tabview.Page("cleaning");
            medianFilteringPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(medianFilteringPage);
			var medianFilteringAction=new desk.action("volume_median_filtering", false);
			medianFilteringAction.setOutputSubdirectory("filtering");
			medianFilteringAction.connect("input_volume", 
										segmentationAction, "seg-cvtgcmultiseg.mhd");
			medianFilteringAction.buildUI();
			medianFilteringPage.add(medianFilteringAction);


			var meshingPage = new qx.ui.tabview.Page("meshing");
            meshingPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(meshingPage);
			var meshingAction=new desk.action("extract_meshes", false);
			meshingAction.setOutputSubdirectory("meshes");
//			meshingAction.connect("input_volume", 
//										medianFilteringAction, "output.mhd");
			meshingAction.buildUI();
			meshingPage.add(meshingAction);

			tools.addListener("changeSessionDirectory", function (e)
			{
				var directory=e.getData();
				medianFilteringAction.setOutputDirectory(directory);
				clusteringAction.setOutputDirectory(directory);
				segmentationAction.setOutputDirectory(directory);
				meshingAction.setOutputDirectory(directory);
				//~ var adjacenciesXMLFileName = "/var/www/html" + "/visu/adjacencies3.xml?nocache="+Math.random();
				//~ var adjacenciesXMLFileName = "/visu/adjacencies3.xml?nocache="+Math.random();
				//~ var adjacenciesXMLFileName = "data/adjacencies3.xml?nocache="+Math.random();
				var adjacenciesXMLFileName = "data/adjacencies7.xml";
				segmentationAction.setActionParameters({
					"input_volume" : volFile,
					"seeds" : tools.getSessionDirectory()+"/seeds.xml"
					//,"adjacencies" : adjacenciesXMLFileName
					});
				clusteringAction.setActionParameters({
					"input_volume" : volFile});
				meshingAction.setActionParameters({
					"input_volume" : tools.getSessionDirectory()+"/filtering/output.mhd"});
			});

			tools.__startSegmentationButton=new qx.ui.form.Button("Start segmentation");
			tools.__startSegmentationButton.addListener("execute", function ()
			{
				tools.__startSegmentationButton.setEnabled(false);
				tools.__segmentationInProgress=true;
				tools.__saveCurrentSeeds(function() {
							medianFilteringAction.executeAction();});
			}, this);
			tools.__bottomRightContainer.add(tools.__startSegmentationButton);

			var meshingButton=new qx.ui.form.Button("extract meshes");
			tools.__extractMeshesButton=meshingButton;
			meshingButton.addListener("execute", function () {
				tools.__startSegmentationButton.setEnabled(false);
				meshingButton.setEnabled(false);
				meshingAction.executeAction();
				}, this);
			tools.__bottomRightContainer.add(meshingButton);

			var segmentationToken=null;
			medianFilteringAction.addListener("actionUpdated", function ()
			{
				tools.__startSegmentationButton.setEnabled(true);
				if (segmentationToken==null)
				{
					segmentationToken=theMaster.addVolume(medianFilteringAction.getOutputDirectory()+"/output.mhd",
								{opacity : 0.5, imageFormat : 0,
								colors : [tools.__labelColorsRed, tools.__labelColorsGreen, tools.__labelColorsBlue]});
				}
				else
				{
					theMaster.updateVolume(segmentationToken);
				}
			}, this);

			tools.__master.addListener("removeVolume", function (e) {
				if (e.getData()==segmentationToken) {
					segmentationToken=null;
				}
			});


			meshingAction.addListener("actionUpdated", function ()
			{
				meshingButton.setEnabled(true);
				tools.__startSegmentationButton.setEnabled(true);
				var meshesViewer=new desk.meshView(tools.getSessionDirectory()+"/meshes/meshes.xml",
								fileBrowser);
			}, this);

			tools.__seedsTypeSelectBox = tools.__getSeedsTypeSelectBox();
			paintPage.addAt(tools.__seedsTypeSelectBox,0);
		},

		loadSession : function()
		{
			this.__clearSeeds();
			var master=this.__master;
			var _this=this;

			master.applyToViewers ( function (sliceView) {
				sliceView.setUserData("previousSlice", sliceView.getSlice());
			});

			var loadSessionRequest = new XMLHttpRequest();
			
			loadSessionRequest.onreadystatechange = function( ) {
				 if(this.readyState == 4 && this.status == 200) {
					// so far so good
					if(this.responseXML!=null) {
						var response = this.responseXML;
						for (var k=0;k<2;k++) {
							var slices;
							if (k==0) {
								slices=response.getElementsByTagName("seed");
							}
							else {
								slices=response.getElementsByTagName("correction");
							}

							for(var j=0; j<slices.length; j++) {
								var sliceId = parseInt(slices[j].getAttribute("slice"),10);
								var sliceOrientation;
								if (slices[j].hasAttribute("orientation")){
									sliceOrientation = parseInt(slices[j].getAttribute("orientation"),10);
								}
								else {
									sliceOrientation = 0;
								}
								master.applyToViewers ( function (sliceView) {
									if(sliceOrientation==sliceView.getOrientation())
										_this.__addNewSeedItemToList(sliceView, sliceId, k);
									});
							}
						master.applyToViewers( function (sliceView) {
								_this.__reloadSeedImage( sliceView );
							});
						}
					}
					else {
						alert("no seeds found");
						master.applyToViewers( function (sliceView) {
								_this.__reloadSeedImage( sliceView );
							});
					}
				}
				else if (this.readyState == 4 && this.status != 200) {
					alert("no seeds found");
					master.applyToViewers( function (sliceView) {
						_this.__reloadSeedImage( sliceView );
						});
				}
			};

			loadSessionRequest.open("GET",
				this.__fileBrowser.getFileURL(
					this.getSessionDirectory()+"/seeds.xml?nocache="+Math.random()), true);
			loadSessionRequest.send(null);
		},

		__getSessionsWidget : function()
		{	
			var tools = this;
			var volFile = this.__file;
			var fileBrowser = this.__fileBrowser;
			
			var sessionsListLayout=new qx.ui.layout.HBox();
			sessionsListLayout.setSpacing(4);
			var sessionsListContainer=new qx.ui.container.Composite(sessionsListLayout);
			var sessionsListLabel=new qx.ui.basic.Label("Sessions : ");
			sessionsListContainer.add(new qx.ui.core.Spacer(), {flex: 5});
			sessionsListContainer.add(sessionsListLabel);
			var button=new qx.ui.form.Button("new session");
			sessionsListContainer.add(button);

			var sessionType="gcSegmentation";
			var sessionsList = new qx.ui.form.SelectBox();
			sessionsListContainer.add(sessionsList);

			var updateInProgress=false;

			function updateList(sessionIdToSelect) {
				updateInProgress=true;
				var buildSessionsItems =function (sessions)
				{
					var sessionItemToSelect=null;
					sessionsList.removeAll();
					for (var i=0; i<sessions.length; i++)
					{
						var sessionId=sessions[i];
						var sessionItem = new qx.ui.form.ListItem(""+sessionId);
						sessionsList.add(sessionItem);
						if (sessionId==sessionIdToSelect)
							sessionItemToSelect=sessionItem;
					}

					if (sessionIdToSelect==null)
					{
						var dummyItem = new qx.ui.form.ListItem("select a session");
						sessionsList.add(dummyItem);
						dummyItem.setUserData("dummy",true);
					}
					if (sessionItemToSelect!=null)
					{
						sessionsList.setSelection([sessionItemToSelect]);
						tools.__tabView.setVisibility("visible");
						tools.setSessionDirectory(fileBrowser.getSessionDirectory(
							volFile,sessionType,sessionIdToSelect));
						tools.__clearSeeds();
					}
					else
						sessionsList.setSelection([dummyItem]);					
					updateInProgress=false;
				};

				fileBrowser.getFileSessions(volFile, sessionType, buildSessionsItems);
			}
			
			sessionsList.addListener("changeSelection", function(e)
			{
				if (!updateInProgress)
				{
					var listItem=sessionsList.getSelection()[0];
					if (listItem.getUserData("dummy")!=true)
					{
						tools.__tabView.setVisibility("visible");
						tools.setSessionDirectory(fileBrowser.getSessionDirectory(
							volFile,sessionType,listItem.getLabel()));
						tools.loadSession();
					}
					sessionsList.close();
				}
			});

			button.addListener("execute", function (e){
				this.__fileBrowser.createNewSession(volFile,sessionType, updateList);
				}, this);

			updateList();
			return sessionsListContainer;
		},

		__saveCurrentSeeds : function(callback) {

			if (this.getSessionDirectory()==null)
				return;

			var numberOfRemainingSaves=1+this.__master.getViewers().length;

			function savecallback () {
				numberOfRemainingSaves--;
				if ((numberOfRemainingSaves==0)&&
					(typeof callback =="function")) {
						callback();
					}
			}
			
        	var wasAnySeedModified=false;
        	var _this=this;
			this.__master.applyToViewers ( function ( sliceView ) {
				var base64Img=_this.__getNewSeedsImage ( sliceView );
				if ( base64Img!=false ) {
					// save image
					var sliceId=sliceView.getUserData( "previousSlice" );
					var seedsType=_this.getSeedsType();
					var fileName=_this.getSessionDirectory()+"/"+
						_this.__getSeedFileName (sliceView, sliceId, seedsType);

					_this.__addNewSeedItemToList ( sliceView, sliceId, seedsType );
					wasAnySeedModified=true;

					var parameterMap={
					action : "save_binary_file",
					file_name : _this.__getSeedFileName (sliceView, sliceId, seedsType),
					base64Data : base64Img,
					output_directory : _this.getSessionDirectory()};
					_this.__fileBrowser.getActions().launchAction(parameterMap, savecallback);
				}
				else {
					savecallback();
				}
				sliceView.setUserData("previousSlice", sliceView.getSlice());
				sliceView.setDrawingCanvasNotModified();
			});
			if (wasAnySeedModified) {
				this.__saveSeedsXML(savecallback);
			}
			else {
				savecallback();
			}
		},

		////Rewrite xml list of the drawn seeds
		__saveSeedsXML : function(callback) {
               // XML writer with attributes and smart attribute quote escaping
			/*
				Format a dictionary of attributes into a string suitable
				for inserting into the start tag of an element.  Be smart
			   about escaping embedded quotes in the attribute values.
			*/
			function formatAttributes (attributes) {
				var APOS = "'";
				var QUOTE = '"';
				var ESCAPED_QUOTE = {  };
				ESCAPED_QUOTE[QUOTE] = '&quot;';
				ESCAPED_QUOTE[APOS] = '&apos;';
				var att_value;
				var apos_pos, quot_pos;
				var use_quote, escape, quote_to_escape;
				var att_str;
				var re;
				var result = '';
				for (var att in attributes) {
					att_value = attributes[att];
					// Find first quote marks if any
					apos_pos = att_value.indexOf(APOS);
					quot_pos = att_value.indexOf(QUOTE);
					// Determine which quote type to use around 
					// the attribute value
					if (apos_pos == -1 && quot_pos == -1) {
						att_str = ' ' + att + "='" + att_value +  "'";	//	use single quotes for attributes
						att_str = ' ' + att + '="' + att_value +  '"';	//	use double quotes for attributes
						result += att_str;
						continue;
					}
					// Prefer the single quote unless forced to use double
					if (quot_pos != -1 && quot_pos < apos_pos) {
						use_quote = APOS;
					}
					else {
						use_quote = QUOTE;
					}
					// Figure out which kind of quote to escape
					// Use nice dictionary instead of yucky if-else nests
					escape = ESCAPED_QUOTE[use_quote];
					// Escape only the right kind of quote
					re = new RegExp(use_quote,'g');
					att_str = ' ' + att + '=' + use_quote + 
						att_value.replace(re, escape) + use_quote;
					result += att_str;
				}
				return result;
			}

			function element (name,content,attributes) {
				var att_str = '';
				if (attributes) { // tests false if this arg is missing!
					att_str = formatAttributes(attributes);
				}
				var xml;
				if (!content){
					xml='<' + name + att_str + '/>';
				}
				else {
					xml='<' + name + att_str + '>' + content + '</'+name+'>';
				}
				return xml;
			}

			var xmlContent = '\n';
			var colors='\n';
			for(var i=0; i<this.__labelColors.length; i++)
			{
				colors+=element('color',null, this.__labelColors[i]);
			}
			xmlContent+=element('colors', colors)+"\n";

			var _this=this;
			this.__master.applyToViewers( function (sliceView) {
				var seedsLists=sliceView.getUserData(desk.segTools.seedsListsString);
				var orientation=sliceView.getOrientation();

				for (var seedsType=0; seedsType<2; seedsType++) {
					var list=seedsLists[seedsType];
					var filePrefix=desk.segTools.filePrefixes[seedsType];
					var slices=list.getChildren();
					for (var i=0;i<slices.length;i++)
					{
						var sliceId=slices[i].getUserData("slice");
						//~ theMaster.debug("352 : sliceId : " + sliceId);
						xmlContent += element(filePrefix,
								_this.__getSeedFileName(sliceView, sliceId, seedsType), 
								{slice: sliceId + "", orientation: orientation + ""}) + '\n';
					}
				}
			});

			var parameterMap={
				action : "save_xml_file",
				file_name : "seeds.xml",
				xmlData : element('seeds', xmlContent),
				output_directory : this.getSessionDirectory()};

			this.__fileBrowser.getActions().launchAction(parameterMap, callback);
		},

		__getSeedsTypeSelectBox : function()
		{
			var theMaster = this.__master;
			var volFile = this.__file;
			var fileBrowser = this.__fileBrowser;
			var selectBox = new qx.ui.form.SelectBox();

			var seedsItem = new qx.ui.form.ListItem("seeds");
			seedsItem.setUserData("seedsType", 0);
			selectBox.add(seedsItem);

			var correctionsItem = new qx.ui.form.ListItem("corrections");
			correctionsItem.setUserData("seedsType", 1);
			selectBox.add(correctionsItem);

			var _this=this;

			function updateSeedsListsVisibility (e) {
				var newSeedsType=selectBox.getSelection()[0].getUserData("seedsType");
				_this.setSeedsType(newSeedsType);
				_this.__master.applyToViewers(function ( sliceView ) {
					var seedsLists=sliceView.getUserData(desk.segTools.seedsListsString);
					seedsLists[newSeedsType].setVisibility("visible");
					seedsLists[1-newSeedsType].setVisibility("excluded");
					_this.__reloadSeedImage (sliceView);
					});
			}

			selectBox.addListener("changeSelection",updateSeedsListsVisibility);
			updateSeedsListsVisibility();
			return selectBox;
		},

		__getNewSeedsImage : function ( sliceView ) {
			if (sliceView.isDrawingCanvasModified()==true) {
				var canvas=sliceView.getDrawingCanvas();
				var seedsImageData=canvas.getContext2d().getImageData(0, 0, canvas.getWidth(), canvas.getHeight());
				var pixels = seedsImageData.data;
				var isAllBlack = true;

				var redArray=this.__labelColorsRed;
				var greenArray=this.__labelColorsGreen;
				var blueArray=this.__labelColorsBlue;
				var numberOfColors=this.__labelColors.length;
				var numberOfBytes=pixels.length
				for(var i=0; i<numberOfBytes; i+=4) {
					if(128<=pixels[i+3])  //  if( color is solid not totally transparent, ie. alpha=0) <-> if( not background )
					{
						var dRed = 0;
						var dGreen = 0;
						var dBlue = 0;
						var distance = 500000;
						var rightColorIndex = 0;

						for(var j=0; j!=numberOfColors; j++) {
							dRed = redArray[j]-pixels[i];
							dGreen = greenArray[j]-pixels[i+1];
							dBlue = blueArray[j]-pixels[i+2];
							var testD = dRed*dRed+dGreen*dGreen+dBlue*dBlue;
							if(testD<distance) {
								distance = testD;
								rightColorIndex = j;
							}
						}
						pixels[i] = redArray[rightColorIndex];
						pixels[i+1] = greenArray[rightColorIndex];
						pixels[i+2] = blueArray[rightColorIndex];
						pixels[i+3] = 255;
						isAllBlack = false;
					}
					////Comment "else" to send combined image
					else {
						pixels[i] = 0;
						pixels[i+1] = 0;
						pixels[i+2] = 0;
						pixels[i+3] = 0;
					}
				}

				if(!isAllBlack) {
					////Send png image to server
					seedsImageData.data = pixels;

					canvas.getContext2d().putImageData(seedsImageData, 0, 0);
					var pngImg = canvas.getContentElement().getCanvas().toDataURL("image/png");
					var saveData=pngImg.replace("image/png", "image/octet-stream");
					var commaIndex=pngImg.lastIndexOf(",");
					var base64Img = pngImg.substring(commaIndex+1,pngImg.length);
					return base64Img;
				}
			}
			return false;
		},

		__addSeedsListsToViews : function ( ) {
			var _this=this;
			this.__master.applyToViewers ( function (sliceView) {
				_this.__addSeedsLists ( sliceView );
			});
		},

		__addSeedsLists : function( sliceView ) {
			// create seeds list
			var seedsList=new qx.ui.form.List();
			seedsList.setWidth(30);
			seedsList.setScrollbarY("off");
			sliceView.add(seedsList);
			seedsList.setVisibility("excluded");

			// create corrections list
			var correctionsList=new qx.ui.form.List();
			correctionsList.setWidth(30);
			correctionsList.setScrollbarY("off");
			sliceView.add(correctionsList);
			correctionsList.setVisibility("excluded");

			var lists=[];
			lists.push(seedsList);
			lists.push(correctionsList);
			sliceView.setUserData(desk.segTools.seedsListsString, lists);

		/*	seedsList.addListener("removeItem", function(event) {
				if (seedsList.getChildren().length==0)
					this.__startSegmentationButton.setEnabled(false);
				}, this);

			seedsList.addListener("addItem", function(event) {
				this.__startSegmentationButton.setEnabled(true);
				}, this);*/

			function keyPressHandler (event) {
				if(event.getKeyIdentifier()=="Delete") {
					var seedsType = this.getSeedsType();
					var list=lists[seedsType];
					var selectedChild = list.getSelection()[0];
					if (selectedChild!=null) {
						var sliceId = selectedChild.getUserData("slice");

						////Erase image on the server
						this.__fileBrowser.getActions().launchAction({action : "delete_file",
										"file_name" : this.getSessionDirectory()+"/"+
										this.__getSeedFileName(sliceView, sliceId, seedsType)});
						list.getUserData("seedsArray")[sliceId]=0;
						list.remove(selectedChild);
						this.__reloadSeedImage( sliceView );
						this.__saveSeedsXML();
					}
				}
			}

			seedsList.addListener("keypress", keyPressHandler, this);
			correctionsList.addListener("keypress", keyPressHandler, this);
		},

		__clearSeeds : function ( ) {
			var master=this.__master;
			this.__master.applyToViewers ( function (sliceView) {
				sliceView.setUserData("previousSlice", sliceView.getSlice());
				var seedsLists=sliceView.getUserData(desk.segTools.seedsListsString);
				for (var i=0;i<2;i++) {
					var numberOfSlices=sliceView.getVolumeSliceToPaint().getNumberOfSlices();
					var seedsArray = [];
					var cacheTagsArray = [];
					for (var j=0;j!=numberOfSlices;j++)
					{
						seedsArray[j]=0;
						cacheTagsArray[j]=Math.random();
					}
					seedsLists[i].removeAll();
					seedsLists[i].setUserData(desk.segTools.seedsArrayString, seedsArray);
					seedsLists[i].setUserData(desk.segTools.cacheTagsArrayString, cacheTagsArray);
				}
			});
		},

		__addNewSeedItemToList : function ( sliceView, sliceId, seedsType )
		{
			var seedsList = sliceView.getUserData(desk.segTools.seedsListsString)[seedsType];
			var seeds = seedsList.getChildren();
			var tempPos = 0;

			for(var i=0; i<seeds.length; i++)
			{
				var currentId=seeds[i].getUserData("slice");
				if(currentId>sliceId) {
					tempPos++;
				}
				if (currentId==sliceId) {
					seedsList.getUserData(desk.segTools.cacheTagsArrayString)[sliceId]=Math.random();
					return;
				}
			}

			var sliceItem = new qx.ui.form.ListItem(""+ sliceId);
			sliceItem.setUserData("slice",sliceId);
			sliceItem.addListener("click", function(event) {
				sliceView.setSlice(event.getTarget().getUserData("slice"));
			});

			seedsList.addAt(sliceItem, tempPos);
			seedsList.getUserData(desk.segTools.seedsArrayString)[sliceId]=sliceItem;
			seedsList.getUserData(desk.segTools.cacheTagsArrayString)[sliceId]=Math.random();
		},

		__getSeedFileName : function(sliceView, sliceId, seedType) {			
			var filePrefix;
			if (seedType==0) {
				filePrefix = "seed";
			}
			else {
				filePrefix = "correction";
			}

			var offset=sliceView.getVolumeSliceToPaint().getSlicesIdOffset();

			switch(sliceView.getOrientation())
			{
				// ZY X
				case 1 :
					return filePrefix +"ZY"+(offset + sliceId) +".png";
					break;
				// XZ Y
				case 2 :
					return filePrefix +"XZ"+(offset + sliceId) +".png";
					break;
				// XY Z
				default :
					return filePrefix +"XY"+(offset + sliceId) +".png";
			}
		}
	} //// END of   members :

}); //// END of   qx.Class.define("desk.segTools",
