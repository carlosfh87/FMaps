;(function (global, $) {

  /**
   * @author Carlos Andrés Figueroa
   * @version V1.0
   * @class [Custom class based on Javascript Google maps API]
   */

  var MapsApi = function (selector, setup) {
    return new MapsApi.init(selector,setup);
  }


  /**
   * @selector  {[string]} container of the map
   * @setup  {[object]} map configuration
   * @return {[MaspApi.ini ob]}
   *
   * Constructor function
   */
  MapsApi.init = function (selector,setup) {


    if(!google){
      throw "Google Maps no defined";
    }

    if(!$){
      throw "jQuery not defined";
    }

    if( !selector || !document.getElementById(selector) ){
      throw "Missing selector";
    }

    // reference to the object this
    var self = this;

    // Setup map options object
    self.setup = setup || {map:{zoom: 15,center: {lat: 41.85, lng: -87.65},mapTypeId: google.maps.MapTypeId.ROADMAP},markerPathImg:null,originMarkerPathImg:null,destinyMarkerPathImg:null};
    // id map container
    self.selector = selector;
    // map
    self.map = null;


    // initial point
    self.iniPoint     = null;
    // end point
    self.endPoint     = null;

    // my geoposition
    self.myPosition   = null;
    self.myPositionMarker   = null;

    this.pathsColors  = self.setup.pathsColors || ["#009fda","#8cc123","#5dbf00","#8cc123"];

    // Instantiate an info window to hold marker info.
      self.stepDisplay  = new google.maps.InfoWindow;

      // default travel mode
      self.travelMode     = google.maps.TravelMode.DRIVING;

      // Config path options
      self.pathConfig   = {
        // path: path,
        strokeColor: "#dd0052",
        strokeOpacity: .7,
        strokeWeight: 3,
        icons: [{
            icon: {
                path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
                scale: 2
            },
            repeat: '5%'
        }],
        geodesic: true,
        clickable: false
    };

    // paths array container
    self.paths = [];
    self.destinyMarkers = [];

    // Labels marjer destiny
    self.labels     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    self.labelIndex   = 0;


    // markers container
    self.markers    = [];
    // marker image path
    self.markerPathImg    = self.setup.markerPathImg || null;
    // start marker image path
    self.originMarkerPathImg = self.setup.originMarkerPathImg || null;
    self.destinyMarkerPathImg = self.setup.destinyMarkerPathImg || null;
    // steps for a path
    self.steps        = [];

    self.oriPoint     = null;

    // instance of google maps Direction service
    self.directionsService = new google.maps.DirectionsService;
    // instance of google maps Direction render
    self.directionsDisplay = new google.maps.DirectionsRenderer;


    // Setup map
    self.setupMap();
  }

  // methods definitions
  MapsApi.prototype = {

    setupMap : function () {

      var self = this;
      self.map = new google.maps.Map(document.getElementById(self.selector), self.setup.map);
    },

    /**
     * @markers {[object Array]} [{location:{lat,lng},description:"html description string"},{location:{lat,lng},description:"html description string"},{location:{lat,lng},description:"html description string"}]
     */
    setMarkers : function (markers, zoomed) {
      var self = this;
      self.clearMarkers();

      var icon = {
        url: self.markerPathImg,
        // This marker is 65 pixels wide by 86 pixels high.
        size: new google.maps.Size(80, 80),
        // The origin for this image is (0, 0).
        origin: new google.maps.Point(0, 0),
        // The anchor for this image is the base of the flagpole at (0, 32).
        anchor: new google.maps.Point(40, 80)
      }

      for (var i = 0; i < markers.length; i++) {
        // markers[i]
        var marker = self.markers[i] = self.createMarker(markers[i].location, icon);

        self.attachInstructionText(self.stepDisplay, marker, markers[i].descriptionHtml, self.map)
      };

      // set bound into the map for the markers
      setTimeout(function() {
        // body...
        self.setBoundsMap(markers, self.map, zoomed);
      },250);

    },

    /**
     * @position  {obj {lat:NUMBER,lng:NUMBER} }
     * @icon   {obj {url:string,size:google.maps.Size, origin:google.maps.Point, anchor:google.maps.Point} }
     * @param  {String}
     * @return {[type]}
     */
    createMarker: function (position, icon, label) {

      var self = this;
      var marker = new google.maps.Marker();

      // validate if the icon is passed
      if (icon) {
        marker.setIcon(icon);
      };

      // validate if the label is passed
      if(label){
        marker.setLabel(label);
      }

      // validate if the position is passed
      if(position){
        marker.setPosition(position);
      }

      marker.setMap(self.map);

      return marker;
    },

    clearMyPositionMarker:function () {
      var self = this;

      if( self.myPositionMarker ){
        self.myPositionMarker.setMap(null);
        self.myPositionMarker = null;
      }
    },

    clearMarkers: function () {
      var self = this;
      for (var i = 0; i < self.markers.length; i++) {
        self.markers[i].setMap(null);
        self.markers[i] = null;
      };
      self.markers = [];
    },

    clearDestinyMarker:function () {
      var self = this;
      for (var i = 0; i < self.destinyMarkers.length; i++) {
        self.destinyMarkers[i].setMap(null);
        self.destinyMarkers[i] = null;
      };
      self.destinyMarkers = [];
    },

    attachInstructionText: function (infowindowdisplay, marker, htmlText, map) {
      google.maps.event.addListener(marker, 'click', function() {
        // Open an info window when the marker is clicked on, containing the htmlText
        // of the step.
        infowindowdisplay.setContent(htmlText);
        infowindowdisplay.open(map, marker);
      });
    },

    setBoundsMap: function (markers, map, zoomed) {
      var self = this;
      var mapBounds = new google.maps.LatLngBounds();

      for (var i = 0; i < markers.length; i++) {
        var lat = markers[i].location.lat;
        var lng = markers[i].location.lng;

        mapBounds.extend( new google.maps.LatLng(lat,lng));
      }

      self.map.fitBounds(mapBounds);

      if (zoomed) {
        google.maps.event.addListenerOnce(map, 'bounds_changed', function (event) {
          if (this.getZoom() > 15) {
            this.setZoom(15);
          }
        });
      }
    },

    /**
     * @travelMode {[string]} "drive" or "walk"
     */
    setTravelMode : function (travelMode) {

      var self = this;

      switch(travelMode)
      {
        case "drive":   self.travelMode = google.maps.TravelMode.DRIVING;
                break;
        case "walk":  self.travelMode = google.maps.TravelMode.WALKING;
                break;
        default:    alert("Invalid trave mode");
                throw "Invalid travel mode";
                break;
      }

      return self;
    },

    /**
     * @position {object} {lat:Number,lng:Number}
     */
    setMapPosition :function(postion) {
      this.map.setCenter(position);
      return this;
    },

    /**
     * @iniPoint        {string || {object} {lat:Number,lng:Number}}
     * @endPoint        {string || {object} {lat:Number,lng:Number}}
     * @callback        {Function} callback function that returns the routes
     * @alternativeRoute    {boolean} if set to true get all the alternative routes, false just one route
     * @drawPath        {boolean} if set to true display all the routes
     * @return MapsApi
     */
    setDestiny: function (iniPoint, endPoint, callback, alternativeRoute, drawPath) {

      var self = this;

      self.iniPoint = iniPoint || "United States";
      self.endPoint = endPoint || "United States";

      // self.setDestinyMarkers()

      var date = new Date();
      self.directionsService.route({
        origin          : self.iniPoint,        // init latlng obj
        destination       : self.endPoint,        // end latlng obj
        provideRouteAlternatives: alternativeRoute || false,  // get multiple routes
        travelMode        : self.travelMode,        // set the travel mode
        drivingOptions      : {
          departureTime: new Date(date.getTime() + 15*60000),
          trafficModel:google.maps.TrafficModel.PESSIMISTIC
        }
      }, function(response, status) {

        if (status === google.maps.DirectionsStatus.OK) {
          if(drawPath === true)
            self.drawPaths(response.routes);

        } else {
          window.alert('Directions request failed due to ' + status);
        }
        // make callback call
        if(callback)
          callback(response);
      });

      return self;
    },

    setDestinyMarkers: function (initPoint, endPoint) {
      var self = this;

      // self.createMarker()
    },

    /**
     * @routes  {Array}
     * @return {[type]}
     */
    drawPaths: function (routes) {
      var self = this;

      self.clearPaths();

      var bound = new google.maps.LatLngBounds();

      for (var i = 0; i < routes.length; i++) {

        var path = [];
        var rawpath = routes[i].overview_path;

        for (var j = 0; j < rawpath.length; j++) {
          var lat = rawpath[j].lat(),
            lng = rawpath[j].lng();
          path.push({lat:lat,lng:lng})
          bound.extend( new google.maps.LatLng(lat,lng));
        };

        if( path.length > 0 ){

          var pathConfig = self.pathConfig;
          pathConfig["path"] = path;
          pathConfig["strokeColor"] = self.getSetsColors(i);

          customPath = new google.maps.Polyline(pathConfig);
          customPath.setMap(self.map);

          self.paths.push(customPath);
        }
      };

      if(!bound.isEmpty())
        self.map.fitBounds(bound);
    },

    /**
     * @return {MapsApi}
     */
    clearPaths: function () {
      var self = this;

      for (var i = 0; i < self.paths.length; i++) {
        if( self.paths[i] !== null ){
          if( self.paths[i].valueOf("setMap") ){
            self.paths[i].setMap(null);
            self.paths[i] = null;
          }
        }
      };

      self.paths = [];
      return self;
    },

    /**
     * @return {string} Genrates a string random color
     */
    getRandomColor: function (){
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++ ) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    },

    getSetsColors:function (index) {
      return this.pathsColors[index];
    },

    /**
     * @callback  {Function}
     * @return {[Function]} // return a callback función with the position
     */
    getCurrentPosition: function (callback) {

      var self = this;

      if(!callback){
        throw "callback not passed";
      }

      navigator.geolocation.getCurrentPosition(function(position) {
        var initpos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({'latLng': initpos}, function(results, status) {

          var response = null;

            if (status == google.maps.GeocoderStatus.OK) {

              var loc = "";
              var postalCode = null;
                if (results[0]) {
                    loc = self.getCountry(results);
                    postalCode = results[0].address_components[results[0].address_components.length-1].long_name
                }
            response = {
              coords: initpos,
              location: loc,
              postalCode:  postalCode,
              status: status
            }

            // Clear my position marker
            self.clearMyPositionMarker();
            // if get position is allowed, then add marker to my position
            self.myPositionMarker = self.createMarker(response.coords);

            // Center the map on my position
            self.map.setCenter(response.coords);
            }else{

            response = {
              coords: null,
              location: null,
              postalCode: null,
              status: status
            };

            }

        callback(response);
        });

        self.myPosition = initpos;
      }, function() {
          var response = {
            coords: null,
            location: null,
            error: true
          };

          callback(response);
      });
    },

    /**
     * @results  {[type]}
     * @return {[type]}
     */
    getCountry: function (results){
      var self = this;
        for (var i = 0; i < results[0].address_components.length; i++)
        {
            var shortname = results[0].address_components[i].short_name;
            var longname = results[0].address_components[i].long_name;
            var type = results[0].address_components[i].types;
            if (type.indexOf("country") != -1)
            {
                if (!self.isNullOrWhitespace(shortname))
                {
                    return shortname;
                }
                else
                {
                    return longname;
                }
            }
        }

    },

    /**
     * @param  {text}
     * @return {Boolean}
     */
    isNullOrWhitespace: function (text) {

      if (text == null) {
            return true;
        }

        return text.replace(/\s/gi, '').length < 1;
    }

  };

  // trick borrowed from jQuery so we don't have to use the 'new' keyword
    MapsApi.init.prototype = MapsApi.prototype;

    // attach our Greetr to the global object, and provide a shorthand '$G' for ease our poor fingers
    global.MapsApi = global.M$ = MapsApi;

}(window, jQuery));
