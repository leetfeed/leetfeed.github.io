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

function addProfilePictureToMessage(uid, storageRef, msgContainer, out){
	var pfpImg = document.createElement('img');
	pfpImg.classList.add(out ? 'out-message-pfp-img' : 'in-message-pfp-img');

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
		if (out){
			msgContainer.append(pfpImg);
		} else {
			msgContainer.prepend(pfpImg);
		}
	}).catch(function(error) {
		console.log('Failed to load profile picture.');
		pfpImg.style.backgroundColor = 'white';
		pfpImg.src = 'images/profile.png';
		if (out){
			msgContainer.append(pfpImg);
		} else {
			msgContainer.prepend(pfpImg);
		}
	});
}

//var msgCount = 1;

function addTextMessageToDOM(msgData, storageRef){
	//document.getElementById('lf-message-board').innerHTML = '';

	var containerDiv = document.createElement('div');
	containerDiv.classList.add(msgData.out ? 'out-message-container' : 'in-message-container');

	if (!msgData.out){
		addProfilePictureToMessage(msgData.from, storageRef, containerDiv, msgData.out);
	}

	var currTime = Math.round((new Date()).getTime() / 1000);

	var usernameAndTimeAgo = document.createElement('span');
	usernameAndTimeAgo.innerHTML = msgData.fromUser + ' sent ' + convertTime(currTime-msgData.timestamp) + ' ago';
	usernameAndTimeAgo.style.color = 'black';

	var rightDiv = document.createElement('div');
	rightDiv.style.display = 'inline-block';
	rightDiv.style.width = '60%';
	rightDiv.append(usernameAndTimeAgo);

	rightDiv.append(document.createElement('br'));

	var messageDiv = document.createElement('div');
	messageDiv.classList.add(msgData.out ? 'out-message' : 'in-message');
	var messageText = document.createElement('p');
	messageText.innerHTML = msgData.text;
	messageDiv.append(messageText);
	rightDiv.append(messageDiv);

	containerDiv.append(rightDiv);

	//console.log("This msg: "+msgNum+", msgCount: "+msgCount);

	document.getElementById('lf-message-board').appendChild(containerDiv);
	//msgCount++;

}

const MAX_CALL_SIZE = 10;

function numCallMembers(dbRef,groupId,callId){
	var callRef = dbRef.child('groups').child(groupId).child('call-data').child(callId);

	callRef.once('value',function(snapshot){
		return snapshot.numChildren();
	});
}

function generateNewOffer(dbRef,groupId,uid,callId,stream){
	var peer = new SimplePeer({
		initiator: true, //location.hash === '#init',
		trickle: false,
		stream: stream
	});

	peer.on('signal', data => {
		var offer = JSON.stringify(data);

		console.log('SIGNAL', offer);
		document.querySelector('#outgoing').textContent = offer;

		// upload this user's offer to firebase
		var callRef = dbRef.child('groups').child(groupId).child('call-data').child(callId);
		callRef.child('member-list').child(uid).set(offer);

		// submit answer from a peer
		callRef.child('member-list').child(uid).on("value",function(snapshot){
			var answer = snapshot.val();
			if (answer !== offer){
				peer.signal(answer);
			}
		});
	});

	peer.on('connect', () => {
		// add end call icon
		console.log("audio call connection successful");

		// generate new offer recursively, upload to this location
		if (numCallMembers(dbRef,groupId,callId) <= MAX_CALL_SIZE){
			generateNewOffer(dbRef,groupId,uid,callId,stream);
		}
	})

	peer.on('data', data => {
		// TODO play audio stream
		console.log("audio data received");
	});

	return peer;
}

function onStartCall(dbRef,groupId,uid,callId){
	navigator.webkitGetUserMedia({video: false, audio: true},function(stream){
		var peer = new SimplePeer({
			initiator: true, //location.hash === '#init',
			trickle: false,
			stream: stream
		});

		peer.on('signal', data => {
			var offer = JSON.stringify(data);

			console.log('SIGNAL', offer);
			document.querySelector('#outgoing').textContent = offer;

			// upload this user's offer to firebase
			/*var callRef = dbRef.child('groups').child(groupId).child('call-data').push();
			callRef.child('member-list').child(uid).set(offer);*/
			var callRef = dbRef.child('groups').child(groupId).child('call-data').child(callId);
			callRef.child("member-list").child(uid).set(offer);

			// submit answer from a peer
			callRef.child('member-list').child(uid).on("value",function(snapshot){
				var answer = snapshot.val();
				if (answer !== offer){
					peer.signal(answer);
				}
			});

			// TODO figure out how to make this non-nested
			peer.on('connect', () => {
				// add end call icon
				console.log("audio call connection successful");

				// generate new offer recursively, upload to this location
				if (numCallMembers(dbRef,groupId,callId) <= MAX_CALL_SIZE){
					generateNewOffer(dbRef,groupId,uid,callRef.key,stream);
				}
			})

		});

		peer.on('data', data => {
			// play audio stream
			console.log("audio data received");
		});
	}, function(err){
		console.log("Failed to get user audio permission");
		alert("Failed to get audio permission, cannot join call.");
	});
}

function onJoinCall(dbRef,groupId,callId,uid){
	// on permission given/call started
	navigator.webkitGetUserMedia({video: false, audio: true},function(stream){

		// get reference to this call
		var callRef = dbRef.child('groups').child(groupId).child('call-data').child(callId);

		// submit offers from each peer
		callRef.child('member-list').once("value",function(snapshot){
			snapshot.forEach(function(userSnapshot){
				var peer = new SimplePeer({
					initiator: false, //location.hash === '#init',
					trickle: false,
					stream: stream
				});

				peer.on('signal', data => {
					// generate answer after submitting offer
					var answer = JSON.stringify(data);

					// upload answer to firebase
					userSnapshot.ref.set(answer);
				});

				// submit the offer from firebase
				peer.signal(userSnapshot.val());

				peer.on('connect', () => {
					// change icon from "join call" to "end call"
					console.log("audio call connection successful, connected with UID "+userSnapshot.key);
				});

				peer.on('data', data => {
					// TODO play audio stream
					console.log("audio data received");
				});
			});
			// add this user to member-list, generate offer recursively
			generateNewOffer(dbRef,groupId,uid,callId,stream);
		});

	}, function(err){
		console.log("Failed to get user audio permission");
		alert("Failed to get audio permission, cannot join call.");
	});
}

function renderGroupCalls(dbRef,groupId,uid){
	dbRef.child('groups').child(groupId).child('call-data').on('value',function(callDataSnapshot){
		callDataSnapshot.forEach(function(callSnapshot){
			// TODO render callSnapshot as a div
			var containerDiv = document.createElement('div');
			containerDiv.classList.add('lf-post-container');

			var callDiv = document.createElement('div');
			callDiv.classList.add('friend-status');

			var callName = document.createElement('h4');
			callName.innerHTML = callSnapshot.child("name").val();

			var numMembers = document.createElement('p');
			numMembers.innerHTML = numCallMembers(dbRef,groupId,callSnapshot.key) + " members";

			var platformTag = createPlatformTag(callSnapshot.child("platform").val());

			var gameTag = document.createElement('div');
			gameTag.classList.add('lf-bottom-post-tag');
			var gameBody = document.createElement('p');
			gameBody.innerHTML = callSnapshot.child("game").val().toUpperCase();
			gameTag.append(gameBody);

			callDiv.append(callName);
			callDiv.append(numMembers);

			callDiv.prepend(platformTag);
			callDiv.prepend(gameTag);

			callDiv.onclick = onJoinCall(dbRef,groupId,callSnapshot.key,uid);

			containerDiv.append(callDiv);
			document.getElementById("group-calls-board").appendChild(containerDiv);
		});
	});
}

/*navigator.webkitGetUserMedia({video: false, audio: true},function(stream){
	// on permission given/call started
	var peer = new SimplePeer({
		initiator: location.hash === '#init',
		trickle: false,
		stream: stream
	});

	peer.on('signal', data => {
		console.log('SIGNAL', JSON.stringify(data));
		document.querySelector('#outgoing').textContent = JSON.stringify(data);
	});

	document.querySelector('form').addEventListener('submit', ev => {
		ev.preventDefault();
		peer.signal(JSON.parse(document.querySelector('#incoming').value));
	});

	peer.on('connect', () => {
		// change icon from "join call" to "end call"
		console.log("audio call connection successful");
	})

	peer.on('data', data => {
		// play audio stream
		console.log("audio data received");
	});

}, function(err){
	console.log("Failed to get user audio permission");
	alert("Failed to get audio permission, cannot join call.");
});*/