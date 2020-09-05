function convertTime(unixSecDelay){
	var mult = [60,60,24,7,4,12];
	var names = ['s','m','h','d','w','mo'];
	var bound = 60;
	var divider = 1;

	var i;
	for (i = 0; i < mult.length; i++) {
		if (unixSecDelay < bound){
			var delay = Math.round(unixSecDelay/divider);
			return delay.toString() + names[i];
		}
		divider = divider*mult[i];
		bound = bound*mult[i+1];
	}
	
	var delay = Math.round(unixSecDelay/31540000);
	return delay.toString() + 'yr';
}

function createPlatformTag(platform){
	var tag = document.createElement('div');
	tag.classList.add('platform-tag');
	var img = document.createElement('img');

	if (platform.includes('Xbox')){
		img.src = 'images/xbox.png';
	} else if (platform.includes('Origin')){
		img.src = 'images/origin.png';
	} else if (platform.includes('Steam')){
		img.src = 'images/steam.png';
	} else if (platform.includes('PS')){
		img.src = 'images/psn.png';
	} else if (platform.includes('Switch')){
		img.src = 'images/switch.png';
	} else {
		img.src = 'images/blank.png';
	}

	tag.append(img);
	return tag;
}

// requires profile-styles.css
function addProfilePictureToCard(uid, storageRef, profileCard){
	var pfpImg = document.createElement('img');
	pfpImg.classList.add('pfp-img');

	storageRef.child('profile_images/'+uid+'.png').getDownloadURL().then(function(url) {
		console.log(url);
		if (url !== undefined){
			console.log('Profile picture URL: '+url);
			pfpImg.src = url;
		} else {
			console.log('Profile picture retrieval returned undefined.');
			pfpImg.style.backgroundColor = 'white';
			pfpImg.src = 'images/profile.png';
		}
		profileCard.prepend(pfpImg);
	}).catch(function(error) {
		console.log('Failed to load profile picture.');
		pfpImg.style.backgroundColor = 'white';
		pfpImg.src = 'images/profile.png';
		profileCard.prepend(pfpImg);
	});
}

function addTextPostToDOM(postData){
	var containerDiv = document.createElement('div');
	containerDiv.classList.add('lf-post-container');

	var postDiv = document.createElement('div');
	postDiv.classList.add('lf-post');

	var title = document.createElement('h2');
	title.innerHTML = postData.title;

	var body = document.createElement('p');
	body.innerHTML = postData.body;
	body.style.fontFamily = "Montserrat";

	var typeTag = document.createElement('div');
	typeTag.classList.add('lf-top-post-tag');
	var type = document.createElement('p');
	type.innerHTML = postData.type.toUpperCase();
	typeTag.append(type);

	postDiv.append(title);

	var gameTag = document.createElement('div');
	gameTag.classList.add('lf-bottom-post-tag');
	var game = document.createElement('p');
	game.innerHTML = postData.game.toUpperCase();
	gameTag.append(game);

	//if (!(postData.type.toString() === "text post"))
	postDiv.prepend(typeTag);
	postDiv.prepend(createPlatformTag(postData.platform));
	postDiv.prepend(gameTag);

	var currTime = Math.round((new Date()).getTime() / 1000);
	var timeSince = currTime - postData.timestamp;

	var timeAndUser = document.createElement('p');
	timeAndUser.innerHTML = "Posted " + convertTime(timeSince) + " ago by " + postData.user;
	postDiv.append(timeAndUser);
	postDiv.append(document.createElement('hr'));
	postDiv.append(body);

	postDiv.append(document.createElement('br'));

	containerDiv.append(postDiv);

	document.getElementById("lf-post-board").appendChild(containerDiv);
}

function renderPostsFor(uid,dbRef){

	//document.getElementById("feed").innerHTML = "<div class=\"pane-title\"><h3>Posts<button class=\"mdc-fab mdc-fab--extended\" id=\"add-post-btn\"><div class=\"mdc-fab__ripple\"></div><span class=\"material-icons mdc-fab__icon\">add</span><span class=\"mdc-fab__label\">Add Post</span></button></h3></div>";
	document.getElementById("lf-post-board").innerHTML = "";

	var postRef = dbRef.child("posts");

	console.log(postRef);

	postRef.once("value", function(snapshot) {
		snapshot.forEach(function(post) {
			console.log(post.key);
			console.log(post.child("title").val());
			console.log(post.child("timestamp").val());

			var postedbyID = post.child("postedby").val();
			var postedbyUser = "";
			dbRef.child("users").child(postedbyID).child("username").once("value", function(postUser) {
				postedbyUser = postUser.val();
				console.log(postUser.val());

				var postType = post.child("type").val();
				postData = {
					postID: post.key,
					title: post.child("title").val(),
					body: post.child("body").val(),
					timestamp: post.child("timestamp").val(),
					postedby: post.child("postedby").val(),
					user: postedbyUser,
					game: post.child("game").val(),
					platform: post.child("platform").val(),
					type: postType
				};

				addTextPostToDOM(postData);
			});
		});
	});
}

function addFriendStatusToDOM(friendData, storageRef){

	var containerDiv = document.createElement('div');
	containerDiv.classList.add('lf-post-container');

	var statusDiv = document.createElement('div');
	statusDiv.classList.add('friend-status');

	addProfilePictureToCard(friendData.friendID, storageRef, statusDiv);

	var username = document.createElement('h4');
	username.innerHTML = friendData.username;

	var game = document.createElement('p');
	game.innerHTML = friendData.game + " on " +friendData.platform;

	statusDiv.append(username);
	//statusDiv.append(game);

	//statusDiv.append(document.createElement('br'));

	var body = document.createElement('p');
	var bodyText = "";

	var statusTag = document.createElement('div');
	statusTag.classList.add('lf-bottom-post-tag');
	var statusBody = document.createElement('p');
	statusBody.innerHTML = friendData.status.toUpperCase();
	statusTag.append(statusBody);

	var currTime = Math.round((new Date()).getTime() / 1000);
	if (friendData.start === "N/A"){
		// This user hasn't played yet
		statusTag.style.backgroundColor = (friendData.status.toString().toUpperCase() === "OFFLINE") ? "lightgray" : "lime";
		bodyText = "This user hasn't played yet.";
	} else if (friendData.status.toString().toUpperCase() === "OFFLINE"){
		var timeSince = currTime - friendData.end;
		var duration = friendData.end - friendData.start;

		game.innerHTML = "Played " + game.innerHTML + " for " + convertTime(duration);
		statusDiv.append(game);

		bodyText = "Last seen " + convertTime(timeSince) + " ago";

		statusTag.style.backgroundColor = "lightgray";
		statusDiv.prepend(createPlatformTag(friendData.platform));
	} else { //if (status == "online"){
		var duration = currTime - friendData.start;

		bodyText = "Playing " + game.innerHTML + " for " + convertTime(duration);
		statusTag.style.backgroundColor = "lime";
		statusDiv.prepend(createPlatformTag(friendData.platform));
	}

	body.innerHTML = bodyText;
	statusDiv.append(body);
	
	/*if (friendData.status.toString().toUpperCase() === "ONLINE"){
		statusDiv.append(document.createElement('br'));
	}*/

	// TODO make padding-bottom consistent, reintroduce game tag
	/*var gameTag = document.createElement('div');
	gameTag.classList.add('lf-bottom-post-tag');
	var game = document.createElement('p');
	game.innerHTML = friendData.game.toUpperCase();
	gameTag.append(game);
	statusDiv.append(gameTag);*/

	statusDiv.prepend(statusTag);
	containerDiv.append(statusDiv);

	document.getElementById("lf-status-board").appendChild(containerDiv);
}

function addFriendRequestToDOM(requestData, dbRef, storageRef){

	var containerDiv = document.createElement('div');
	containerDiv.classList.add('lf-post-container');

	var statusDiv = document.createElement('div');
	statusDiv.classList.add('friend-status');

	var statusTag = document.createElement('div');
	statusTag.classList.add('lf-top-post-tag');
	var statusBody = document.createElement('p');
	statusBody.innerHTML = requestData.in ? "FRIEND REQUEST FROM" : "YOU FRIEND REQUESTED";
	statusTag.append(statusBody);

	var username = document.createElement('h4');
	username.innerHTML = requestData.username;

	statusDiv.append(username);
	statusDiv.prepend(statusTag);

	if (!requestData.in){
		var cancel = document.createElement('button');
		cancel.classList.add('btn');
		cancel.classList.add('btn-light');
		cancel.style.float = 'right';
		cancel.style.marginBottom = '5px';
		cancel.innerHTML = "Cancel Request";
		cancel.onclick = function(){
			dbRef.child('users').child(requestData.uid).child('friends/outrequests').child(requestData.friendID).remove();
			dbRef.child('users').child(requestData.friendID).child('friends/inrequests').child(requestData.uid).remove();

			alert("Friend request to "+requestData.username+" cancelled.");
			renderFriendActivityFor(requestData.uid, dbRef, storageRef);
		}

		statusDiv.append(cancel);
	} else {
		var reject = document.createElement('button');
		reject.classList.add('btn');
		reject.classList.add('btn-light');
		reject.style.float = 'right';
		reject.style.marginBottom = '5px';
		reject.innerHTML = "Reject";
		reject.onclick = function(){
			dbRef.child('users').child(requestData.uid).child('friends/inrequests').child(requestData.friendID).remove();
			dbRef.child('users').child(requestData.friendID).child('friends/outrequests').child(requestData.uid).remove();

			alert("Friend request from "+requestData.username+" rejected.");
			renderFriendActivityFor(requestData.uid, dbRef, storageRef);
		}

		var accept = document.createElement('button');
		accept.classList.add('btn');
		accept.classList.add('btn-light');
		accept.style.float = 'right';
		accept.style.marginLeft = '5px';
		accept.style.marginBottom = '5px';
		accept.innerHTML = "Accept";
		accept.onclick = function(){
			dbRef.child('users').child(requestData.uid).child('friends/inrequests').child(requestData.friendID).remove();
			dbRef.child('users').child(requestData.friendID).child('friends/outrequests').child(requestData.uid).remove();

			dbRef.child('users').child(requestData.uid).child('friends').child(requestData.friendID).set("");
			dbRef.child('users').child(requestData.friendID).child('friends').child(requestData.uid).set("");

			alert("Friend request from "+requestData.username+" accepted.");
			renderFriendActivityFor(requestData.uid, dbRef, storageRef);
		}

		statusDiv.append(accept);
		statusDiv.append(reject);
	}

	containerDiv.append(statusDiv);
	document.getElementById("lf-status-board").appendChild(containerDiv);
}

function renderFriendActivityFor(uid, dbRef, storageRef){

	var friendRef = dbRef.child("users").child(uid).child("friends");
	friendRef.on("value", function(snapshot) {
		document.getElementById("lf-status-board").innerHTML = "";
		
		snapshot.forEach(function(friend){
			var friendID = friend.key.toString();

			if (friendID === 'inrequests' || friendID === 'outrequests')
				return;

			console.log(friendID);

			var thisFriendRef = dbRef.child("users").child(friendID);
			thisFriendRef.on("value", function(snapshot) {
				var username = snapshot.child("username").val();
				var platform = snapshot.child("platform").val();
				var status = snapshot.child("status").val();
				var start = snapshot.child("start").val();
				var end = snapshot.child("end").val();
				var game = snapshot.child("game").val();

				var friendData = {
					friendID: friendID,
					username: username,
					status: status,
					start: start,
					end: end,
					game: game,
					platform: platform
				};

				console.log(friendData);
				addFriendStatusToDOM(friendData, storageRef);
			});
		});
	});

	friendRef.child("inrequests").once("value", function(snapshot) {
		snapshot.forEach(function(inrequest){
			// build inrequest data and call
			var friendID = inrequest.key.toString();
			dbRef.child('users').child(friendID).child('username').once("value", function(friendUser){
				var username = friendUser.val();

				var reqData = {
					in: true,
					friendID: friendID,
					username: username,
					uid: uid
				};

				addFriendRequestToDOM(reqData, dbRef);
			});
		});
	});

	friendRef.child("outrequests").once("value", function(snapshot) {
		snapshot.forEach(function(outrequest){
			// build outrequest data and call
			var friendID = outrequest.key.toString();
			dbRef.child('users').child(friendID).child('username').once("value", function(friendUser){
				var username = friendUser.val();

				var reqData = {
					in: false,
					friendID: friendID,
					username: username,
					uid: uid
				};

				addFriendRequestToDOM(reqData, dbRef);
			});
		});
	});

}