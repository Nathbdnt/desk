qx.Class.define("desk.TextEditor", 
{
  extend : qx.ui.window.Window,

	construct : function(file)
	{
		this.base(arguments);
		this.setLayout(new qx.ui.layout.VBox());
		this.setHeight(500);
		this.setWidth(500);
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);

		this.__reloadButton = new qx.ui.form.Button("Reload");
		this.__reloadButton.addListener("execute", function(e) {
			this.openFile(this.__file);
		}, this);

		var saveButton = new qx.ui.form.Button("Save");
		saveButton.addListener("execute", function(e) {
			saveButton.setEnabled(false);
			desk.FileSystem.writeFile(this.__file, this.__textArea.getValue(),
				function () {saveButton.setEnabled(true);});
		}, this);

		this.__executeButton = new qx.ui.form.Button("execute");
		this.__executeButton.addListener("execute", function(e) {
			eval('(function () {' + this.__textArea.getValue() + '\n})()');
		}, this);

		var spinner = new qx.ui.form.Spinner(5, 15, 50);
		spinner.addListener('changeValue', function (e) {
			this.__textArea.setFont(qx.bom.Font.fromString(e.getData() + ' serif'));
		}, this);

		var buttonsContainer = new qx.ui.container.Composite;
		buttonsContainer.setLayout(new qx.ui.layout.HBox());
		buttonsContainer.add(this.__executeButton, {flex : 1});
		buttonsContainer.add(this.__reloadButton, {flex : 1});
		buttonsContainer.add(saveButton, {flex : 1});
		buttonsContainer.add (spinner);
		this.add(buttonsContainer);

		var textArea = new qx.ui.form.TextArea();
		this.__textArea = textArea
		textArea.setFont(qx.bom.Font.fromString("15 serif"));
		this.add(textArea,{flex : 1});
		this.open();
		this.center();
		this.openFile(file);
		return (this);
	},

	members : {
		__textArea : null,
		__file : null,
		__reloadButton : null,
		__executeButton : null,

		openFile : function (file)
		{
			if (file.substring(file.length - 3) === '.js') {
				this.__executeButton.setVisibility('visible');
			}
			else {
				this.__executeButton.setVisibility('excluded');
			}

			this.__file = file;
			this.__reloadButton.setEnabled(false);
			desk.FileSystem.readFile(file, function (request){
				this.__textArea.setValue(request.getResponseText());
				this.setCaption(file);
				this.__reloadButton.setEnabled(true);
			}, this);
		}
	}
});
