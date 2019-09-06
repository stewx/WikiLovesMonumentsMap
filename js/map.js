var GOOGLE_MAPS_API_KEY = 'AIzaSyCpEmKC7qoSMNi5k21FayydQ19xW3SbzOg';
var map;
var markers = [];
var idsMapped = [];
var openInfoWindows = [];
var markerLimit = 1000;

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

function initialize() {
    var mapOptions = {
        center: {
            lat: 44.6516904,
            lng: -63.5839593
        },
        zoom: 15
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    // Bind events
    google.maps.event.addListener(map, 'bounds_changed', debounce(function() {
        loadMonuments();
    }, 250));

}
google.maps.event.addDomListener(window, 'load', initialize);

function loadMonuments() {
    // Get monuments
    var bounds = map.getBounds();
    var northeastCoords = bounds.getNorthEast();
    var southwestCoords = bounds.getSouthWest();
    var monuments = [];

    $.ajax({
        url: 'http://tools.wmflabs.org/heritage/api/api.php',
        method: "GET",
        dataType: "jsonp",
        jsonpCallback: 'wlm' + makeid(),
        data: {
            action: 'search',
            //srcountry: 'ca',
            srlang: 'en',
            //srmunicipality: 'Halifax',
            bbox: [southwestCoords.lng(), southwestCoords.lat(), northeastCoords.lng(), northeastCoords.lat()].join(),
            format: 'json',
            limit: '500'
        },
        timeout: 10000, // 10 second timeout
        success: function(data) {

            monuments = data.monuments;
            console.log("Got " + monuments.length + " monuments from API.")

            // Add markers
            addMarkers(monuments);

            // Clean up old markers if needed
            cleanupMarkers();
        }
    });
}

function addMarkers(monuments) {
    for (var i = 0; i < monuments.length; i++) {
        var monument = monuments[i];
        if (idsMapped.indexOf(monument.id) === -1) {
            var icon = monument.image.length === 0 ? "images/withoutimageicon.png" : "images/withimageicon.png";
            var marker = new google.maps.Marker({
                map: map,
                position: {
                    lat: monument.lat,
                    lng: monument.lon
                },
                title: monument.name,
                icon: icon,
                animation: google.maps.Animation.DROP
            });
            markers.push(marker);
            var officialUrl = '';
            var contentString = '<h3>' + monument.name + '</h3>' +
                '<p>Address: ' + monument.address + '</p>' +
                '<p><a href="' + monument.source + '">View on Wikipedia</a></p>';
            if (monument.country === 'ca') {
                officialUrl = 'http://www.historicplaces.ca/en/rep-reg/place-lieu.aspx?id=' + monument.id;

            } else if (monument.registrant_url) {
                officialUrl = monument.registrant_url;
            }
            if (officialUrl) {
                contentString += '<p><a target="_blank" href="' + officialUrl + '">View official listing</a></p>';
            }

            var infoWindow = new google.maps.InfoWindow();
            bindInfoWindow(marker, map, infoWindow, contentString);

            idsMapped.push(monument.id);
        }
    }
}

function bindInfoWindow(marker, map_object, infowindow, html) {
    google.maps.event.addListener(marker, 'click', function() {
        for (var i = 0; i < openInfoWindows.length; i++) {
            openInfoWindows[i].close();
        }
        openInfoWindows = [];
        infowindow.setContent(html);
        infowindow.open(map_object, marker);
        openInfoWindows.push(infowindow);
    });
}

function cleanupMarkers() {

    if (markers.length > markerLimit) {
        // Remove markers not in current view
        var countRemoved = 0;
        for (var i = 0; i < markers.length; i++) {
            if (markers.length <= markerLimit) {
                console.log("Number of markers is within the limit (" + markers.length + "/" + markerLimit + ").");
                break;
            }

            if (!map.getBounds().contains(markers[i].getPosition())) {
                // Delete from marker list
                markers[i].setMap(null);
                markers.splice(i, 1);
                countRemoved++;
            }
        }
        console.log("Removed " + countRemoved + " markers that were not in bounds.");
    }

}

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}