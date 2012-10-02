/**
 * Singleton helper class for file system operations : path->URL conversion, session management etc...
 */
qx.Class.define("desk.FileSystem", 
{
	extend : qx.core.Object,

	type : "singleton",

	construct : function()
	{
		this.base(arguments);
		var URLparser = document.createElement('a');
		URLparser.href = document.href;

		var pathname=URLparser.pathname;
		this.__user=URLparser.pathname.split("/")[1];
		console.log('user : '+this.__user);
		this.__baseURL='/'+this.__user+'/';
		this.__phpURL=this.__baseURL+'ext/php/';
		this.__filesURL=this.__baseURL+'files/';
		return this;
	},

	members : {
		__baseURL : null,
		__filesURL : null,
		__phpURL : null,
		__user : null,


		/**
		* Returns the base URL string
		*
		* @return {String} baseURL
		*/
		getBaseURL : function () {
			return this.__baseURL;
		},

		/**
		* Translates a file path to an URL
		*
		* @param file {String} file path
		*
		* @return {String} URL
		*/
		getFileURL : function (file) {
			return this.__filesURL+file;
		},

		/**
		* Returns the directory for the given file, session type and Id
		*
		* @param file {String} file path
		* @param sessionType {String} session type (e.g. "gcSegmentation")
		* @param sessionId {Number} session Id
		*
		* @return {String} directory path
		*/
		getSessionDirectory : function (file,sessionType,sessionId)
		{
			return file+"."+sessionType+"."+sessionId;
		},

		/**
		* creates an array containing sessions of given type (string)
		* sessions are directories for which the name contains in order:
		* -the file name
		* -the session type
		* -the session Id
		* all separated by a "."
		* @param file {String} file path
		* @param sessionType {String} session type (e.g. "gcSegmentation")
		* @param callback {Function} the callback when the list is constructed
		*
		* the array is the first parameter for the callback function
		*/ 
		getFileSessions : function (file, sessionType, callback)
		{
			var lastSlashIndex=file.lastIndexOf("/");
			var directory=file.substring(0,lastSlashIndex);

			var shortFileName=file.substring(lastSlashIndex+1,file.length);
			function readFileList(e)
			{
				var sessions=[];
				var req = e.getTarget();
				var files=req.getResponseText().split("\n");
				for (var i=0;i<files.length;i++)
				{
					var splitfile=files[i].split(" ");
					var fileName=splitfile[0];
					if (fileName!="")
					{
						if (splitfile[1]=="dir")
						{
							//first, test if the directory begins like the file
							var childLabel=splitfile[0];
							var begining=childLabel.substring(0,shortFileName.length+1);
							if (begining==(shortFileName+"."))
							{
								var remaining=childLabel.substring(shortFileName.length+1, childLabel.length);
								if (sessionType!=null)
								{
									var childSession=remaining.substring(0,sessionType.length+1);
									if (childSession==(sessionType+"."))
									{
										var sessionId=parseInt(remaining.substring(sessionType.length+1,remaining.length));
										sessions.push(sessionId);
									}
								}
								else
								{
									alert("error : no session type asked");
								}
							}
						}
					}
				}
				// we need to tweak the .sort() method so that it generates correct output for ints
				function sortNumber(a,b)
				{
					return b - a;
				}
				sessions.sort(sortNumber);
				callback(sessions);
			}

			// Instantiate request
			var req = new qx.io.request.Xhr();
			req.setUrl(this.__phpURL+"listDir.php");
			req.setMethod("POST");
			req.setAsync(true);
			req.setRequestData({"dir" : directory});
			req.addListener("success", readFileList, this);
			req.send();
		},

		/**
		* Creates a new session
		* sessions are directories for which the name contains in order:
		* -the file name
		* -the session type
		* -the session Id
		* all separated by a "."
		* @param file {String} file path
		* @param sessionType {String} session type (e.g. "gcSegmentation")
		* @param callback {Function} the callback when the session is created
		*
		* executes the callback with the new session Id as parameter when finished
		*/
		createNewSession : function (file, sessionType, callback)
		{
			var that=this;
			function success(sessions)
			{
				var maxId=-1;
				for (var i=0;i<sessions.length;i++)
				{
					var sessionId=sessions[i];
					if (sessionId>maxId)
						maxId=sessionId;
				}

				var newSessionId=maxId+1;

				function getAnswer(e)
				{
					callback(newSessionId);
				}


				var lastSlash=file.lastIndexOf("/");
				var subdir=file.substring(lastSlash+1)+"."+sessionType+"."+newSessionId;
				var parameterMap={
					"action" : "add_subdirectory",
					"subdirectory_name" : subdir,
					"output_directory" : file.substring(0,lastSlash)};
				desk.actions.getInstance().launchAction(parameterMap, getAnswer);
			}

			this.getFileSessions(file, sessionType, success);
		}
	}
});
