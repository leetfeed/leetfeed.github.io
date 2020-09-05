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

function addTextPostToProfile(postData){
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

	document.getElementById("profile-posts-board").appendChild(containerDiv);
}

function renderProfilePostsFor(uid,username,dbRef){

	document.getElementById('profile-posts-board').innerHTML = "";
	var postRef = dbRef.child("users").child(uid).child('posts');

	console.log(postRef);

	postRef.once("value", function(snapshot) {
		snapshot.forEach(function(pk) {
			var postKey = pk.key;

			console.log(pk.key);

			dbRef.child("posts").child(postKey).once("value", function(post) {

				var postType = post.child("type").val();
				postData = {
					postID: post.key,
					title: post.child("title").val(),
					body: post.child("body").val(),
					timestamp: post.child("timestamp").val(),
					postedby: post.child("postedby").val(),
					game: post.child("game").val(),
					user: username,
					platform: post.child("platform").val(),
					type: postType
				};

				addTextPostToProfile(postData);
			});
		});
	});
}

function renderProfileFor(uid, dbRef, storageRef){

	document.getElementById('profile-board').innerHTML = "";
	var userRef = dbRef.child('users').child(uid);

	var profileCard = document.createElement('div');
	profileCard.classList.add('profile-card');

	userRef.once("value", function(snapshot) {

		addProfilePictureToCard(uid, storageRef, profileCard);

		var username = document.createElement('h2');
		//username.style.display = 'inline';
		username.style.paddingBottom = '0';
		username.innerHTML = snapshot.child('username').val();
		profileCard.append(username);

		console.log(username.innerHTML);

		// append games to card
		snapshot.child('info').child('games').forEach(function(game){
			var gameTitle = game.val().toUpperCase();

			var gameTag = document.createElement('div');
			gameTag.classList.add('profile-game-tag');
			var game = document.createElement('p');
			game.innerHTML = gameTitle;
			gameTag.append(game);

			profileCard.append(gameTag);
		});

		var platformContainer = document.createElement('div');
		platformContainer.classList.add('platform-tag-container');
		snapshot.child('info').child('platforms').forEach(function(platform){
			var platformTitle = platform.val();
			var platformTag = createPlatformTag(platformTitle);
			platformTag.style.transform = 'skew(0deg)';
			platformTag.style.width = '32px';
			platformTag.style.height = '32px';
			platformTag.style.marginLeft = '5px';
			platformContainer.append(platformTag);
		});
		profileCard.prepend(platformContainer);

		var bio = document.createElement('p');
		bio.innerHTML = snapshot.child('bio').val();
		bio.style.fontFamily = 'Montserrat';
		profileCard.append(bio);

		//profileCard.append(document.createElement('hr'));

		var container = document.createElement('div');
		container.classList.add('profile-card-container');
		container.append(profileCard);
		container.style.borderBottom = '1px solid black';
		container.style.marginBottom = '5px';

		document.getElementById("profile-board").appendChild(container);
		//document.getElementById("profile-board").appendChild(document.createElement('hr'));
		renderProfilePostsFor(uid, username.innerHTML, dbRef);
	});
}

function loadUserStatus(userData, storageRef){
	document.getElementById("lf-status-board").innerHTML = "";

	var containerDiv = document.createElement('div');
	containerDiv.classList.add('lf-post-container');

	var statusDiv = document.createElement('div');
	statusDiv.classList.add('friend-status');

	addProfilePictureToCard(userData.uid, storageRef, statusDiv);

	var username = document.createElement('h4');
	username.innerHTML = userData.username;

	var game = document.createElement('p');
	game.innerHTML = userData.game + " on " +userData.platform;

	statusDiv.append(username);
	//statusDiv.append(game);

	//statusDiv.append(document.createElement('br'));

	var body = document.createElement('p');
	var bodyText = "";

	var statusTag = document.createElement('div');
	statusTag.classList.add('lf-bottom-post-tag');
	var statusBody = document.createElement('p');
	statusBody.innerHTML = userData.status.toUpperCase();
	statusTag.append(statusBody);

	var currTime = Math.round((new Date()).getTime() / 1000);
	if (userData.start === "N/A"){
		// This user hasn't played yet
		bodyText = "This user hasn't played yet.";
	} else if (userData.status.toString().toUpperCase() === "OFFLINE"){
		var timeSince = currTime - userData.end;
		var duration = userData.end - userData.start;

		game.innerHTML = "Played " + game.innerHTML + " for " + convertTime(duration);
		statusDiv.append(game);

		bodyText = "Last seen " + convertTime(timeSince) + " ago";

		statusTag.style.backgroundColor = "lightgray";
		statusDiv.prepend(createPlatformTag(userData.platform));
	} else { //if (status == "online"){
		var duration = currTime - userData.start;

		bodyText = "Playing " + game.innerHTML + " for " + convertTime(duration);
		statusTag.style.backgroundColor = "lime";
		statusDiv.prepend(createPlatformTag(userData.platform));
	}

	body.innerHTML = bodyText;
	body.style.display = 'inline';
	statusDiv.append(body);

	// TODO make padding-bottom consistent, reintroduce game tag
	/*var gameTag = document.createElement('div');
	gameTag.classList.add('lf-bottom-post-tag');
	var game = document.createElement('p');
	game.innerHTML = userData.game.toUpperCase();
	gameTag.append(game);
	statusDiv.append(gameTag);*/

	statusDiv.prepend(statusTag);
	containerDiv.append(statusDiv);

	document.getElementById("lf-status-board").appendChild(containerDiv);
}