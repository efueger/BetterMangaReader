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
	var found = false,
		index;

	for (var i = 0; i < bmr_storage.state.length; i++) {
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

function update_icon_number() {
	var icon_number = 0;

	bmr_storage.state.forEach(function (manga) {
		if (parseFloat(manga.latest, 10) > parseFloat(manga.latestRead, 10) && manga.isTracked) {
			icon_number += 1;
		}
	});

	chrome.browserAction.setBadgeText({
		'text': (icon_number < 1) ? '' : '' + icon_number
	});

	console.log('new icon number', icon_number);
}

function expandMangas() {
	var updated = bmr_storage.expandMangaData(bmr_storage.state);
	console.log('updated mangas', updated);
}

// bmr_storage.loadExample();
bmr_storage.loadState();

(function backgroundInit() {

	console.log("Storage state", bmr_storage.state);

	if (bmr_storage.state.length > 0) {

		var backup_interval = setInterval(function () {
			backup(bmr_storage.state);
		}, 60000); // every min

		update_icon_number();

		setTimeout(expandMangas, 60000);
		var expandedDelay = setTimeout(expandMangas, 600000);

	} else {

		console.log('No manga yet. Will try again.');
		var retry = setTimeout(backgroundInit, 500);

	}


})();



// Called when the user clicks on the browser action icon.
chrome.browserAction.onClicked.addListener(function () {

	var optionspage = 'src/pages/index.html',
		optionsUrl = chrome.extension.getURL(optionspage);

	chrome.tabs.query({}, function (extensionTabs) {
		var found = false;

		for (var i = 0; i < extensionTabs.length; i++) {
			if (optionsUrl == extensionTabs[i].url) {
				found = true;
				chrome.tabs.update(extensionTabs[i].id, {
					"selected": true
				});
			}
		}
		if (!found) {
			chrome.tabs.create({
				url: optionspage
			});
		}
	});

});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

	console.log('request recieved', request);

	var this_manga;

	if (request.isMangaTracked !== undefined) {
		sendResponse(already_tracked(request.isMangaTracked));
	}

	if (request.updateMangaReadChapter !== undefined) {
		this_manga = bmr_storage.state[request.updateMangaReadChapter.id];

		this_manga.latestRead = request.updateMangaReadChapter.info.currentChapter;
		this_manga.urlOfLatestRead = request.updateMangaReadChapter.info.currentChapterURL;

		sendResponse('updated read chapter');
	}

	if (request.markMangaAsRead !== undefined) {
		this_manga = bmr_storage.state[already_tracked(request.markMangaAsRead)[1]];



		this_manga.latestRead = this_manga.latest;
		this_manga.urlOfLatestRead = this_manga.chapter_list[0][2];

		sendResponse('Manga marked as read');
	}

	if (request.resetMangaReading !== undefined) {
		var this_manga = bmr_storage.state[already_tracked(request.resetMangaReading)[1]];

		this_manga.latestRead = '0';
		this_manga.urlOfLatestRead = this_manga.url;

		sendResponse('Manga marked as read');
	}

	if (request.mangaToTrack !== undefined) {

		console.log('attempting to save new manga');

		var new_manga = request.mangaToTrack,
			is_tracked = already_tracked(new_manga.name);

		if (is_tracked[1] === null) {

			new_manga.id = bmr_storage.state.length;
			bmr_storage.state.push(new_manga);

			console.log('item not found');

		} else {

			bmr_storage.state[is_tracked[1]].isTracked = true;

			console.log('item found', bmr_storage.state[is_tracked[1]]);

		}

		sendResponse('Now Tracking Manga');

	}

	if (request.mangaToStopTracking !== undefined) {

		console.log('attempting to stop tracking manga');

		var found = already_tracked(request.mangaToStopTracking);

		if (found[0] === true) {
			bmr_storage.state[found[1]].isTracked = false;
		}

		sendResponse('Have Stopped Tracking');
	}

	if (request.runAmrConverter !== undefined) {

		chrome.bookmarks.search('All Manga Reader', function (results) {

			var content = results[0].url.substr(17);
			content = content.substr(0, content.length - 27);

			backup(amr_converter(content));

		});
		

	}

	update_icon_number();

});