function backup(data) {

	console.log("data being back-ed up", data);

	chrome.bookmarks.search('BMR Back-up', function (results) {
		if (results.length > 0) {

			bmr_storage.updateBackup(JSON.stringify(data), results[0]);

		} else {

			bmr_storage.createBackup(JSON.stringify(data));

		}
	});

	bmr_storage.loadState();

}

function already_tracked(search_name) {
	var i = bmr_storage.state.length,
		found = false,
		index;

	while (--i) {
		if (bmr_storage.state[i].name === search_name) {
			if (bmr_storage.state[i].isTracked) {
				found = true;
			}
			index = i;
			break;
		}
	}

	return [found, index];
}

// bmr_storage.loadExample();
bmr_storage.loadState();

(function backgroundInit() {

	console.log("Storage state", bmr_storage.state);

	if (bmr_storage.state.length > 0) {

		var backup_interval = setInterval(function () {
			backup(bmr_storage.state);
		}, 60000); // every min

	} else {

		console.log('No manga yet. Will try again.');
		var retry = setTimeout(backgroundInit, 300);

	}
})();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

	console.log('request recieved', request);

	if (request.isMangaTracked !== undefined) {
		sendResponse(already_tracked(request.isMangaTracked));
	}

	if (request.mangaToTrack !== undefined) {

		console.log('attempting to save new manga');

		var new_manga = request.mangaToTrack,
			is_tracked = already_tracked(new_manga.name);

		if (!is_tracked[0]) {
			new_manga.id = bmr_storage.state.length;
			bmr_storage.state.push(new_manga);
			console.log(bmr_storage);
		} else {
			new_manga.id = bmr_storage.state[is_tracked[1]].id;
			bmr_storage.state[is_tracked[1]] = new_manga;
		}

		sendResponse('Now Tracking Manga');

	};

});