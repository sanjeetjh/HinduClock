/* 
 * The MIT License (MIT)
 *
 *Copyright (c) 2016 Sanjeet Jha
 *
 *Permission is hereby granted, free of charge, to any person obtaining a copy
 *of this software and associated documentation files (the "Software"), to deal
 *in the Software without restriction, including without limitation the rights
 *to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *copies of the Software, and to permit persons to whom the Software is
 *furnished to do so, subject to the following conditions:
 *
 *The above copyright notice and this permission notice shall be included in all
 *copies or substantial portions of the Software.
 *
 *THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *SOFTWARE.
 */


/**
 * @author Sanjeet Jha
 */
( function() {

		// var's
		var PI = Math.PI,
		    sin = Math.sin,
		    cos = Math.cos,
		    asin = Math.asin,
		    acos = Math.acos,
		    rad = PI / 180,
		    oneDayMinSec = 24*60*60*1000,
		    sunrise;
		    
		var options = {};

		var mainDiv;
	
		// Define our constructor
		this.HinduClock = function() {

			// Define option defaults
			var defaults = {
				className : 'hinduClock',
				elId : 'clock',
				overlay : true,
				showVipala: false,
				showEnTime: false,
				showSunrise : false,
				showSunset : false
			};

			// Create options by extending defaults with the passed in arugments
			if (arguments[0] && typeof arguments[0] === "object") {
				options = extendDefaults(defaults, arguments[0]);
			} else {
				options = defaults;
			}
			mainDiv = document.getElementById(options.elId);
			getLocation();
		};
		function extendDefaults(source, properties) {
			var property;
			for (property in properties) {
				if (properties.hasOwnProperty(property)) {
					source[property] = properties[property];
				}
			}
			return source;
		}

		function getLocation() {
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(initClock, showError);
			} else {
				mainDiv.innerHTML = "Geolocation is not supported by this browser.";
			}
		}

		function initClock(position) {
			//x.innerHTML = "T: " + position.coords.latitude + "<br>Longitude: " + position.coords.longitude;
			var time = getTimes(new Date(), position.coords.latitude, position.coords.longitude);
			sunrise = time.sunrise;
			if(options.showVipala){
				window.setInterval(showClock,100);
			}else{
				window.setInterval(showClock,500);
			}
		}

		function showError(error) {
			switch(error.code) {
			case error.PERMISSION_DENIED:
				mainDiv.innerHTML = "User denied the request for Geolocation.";
				break;
			case error.POSITION_UNAVAILABLE:
				mainDiv.innerHTML = "Location information is unavailable.";
				break;
			case error.TIMEOUT:
				mainDiv.innerHTML = "The request to get user location timed out.";
				break;
			case error.UNKNOWN_ERROR:
				mainDiv.innerHTML = "An unknown error occurred.";
				break;
			}
		}
		
		function showClock(){
			mainDiv.innerHTML = "Time: " + sunrise.getHours() + ':' + sunrise.getMinutes();
			var temp = parseInt(((new Date()).getTime() - sunrise.getTime())/400,10);
			if(options.showVipala){
				mainDiv.innerHTML = "" + parseInt((temp/60/60)%60,10) + ":" + parseInt((temp/60)%60,10) + ":" + parseInt(temp%60,10);
			}else{
				mainDiv.innerHTML = "" + parseInt((temp/60/60)%60,10) + ":" + parseInt((temp/60)%60,10) ;
			}
		}
		//long second = (millis / 1000) % 60;
		//long minute = (millis / (1000 * 60)) % 60;
		//long hour = (millis / (1000 * 60 * 60)) % 24;

		// date/time constants and conversions

		var dayMs = 1000 * 60 * 60 * 24,
		    J1970 = 2440588,
		    J2000 = 2451545;

		function toJulian(date) {
			return date.valueOf() / dayMs - 0.5 + J1970;
		}

		function fromJulian(j) {
			return new Date((j + 0.5 - J1970) * dayMs);
		}

		function toDays(date) {
			return toJulian(date) - J2000;
		}

		function declination(l, b) {
			return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l));
		}

		var e = rad * 23.4397;
		// obliquity of the Earth
		// calculations for sun times

		var J0 = 0.0009;

		function julianCycle(d, lw) {
			return Math.round(d - J0 - lw / (2 * PI));
		}

		function approxTransit(Ht, lw, n) {
			return J0 + (Ht + lw) / (2 * PI) + n;
		}

		function solarTransitJ(ds, M, L) {
			return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L);
		}

		// general sun calculations

		function solarMeanAnomaly(d) {
			return rad * (357.5291 + 0.98560028 * d);
		}

		function eclipticLongitude(M) {

			var C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)), // equation of center
			    P = rad * 102.9372;
			// perihelion of the Earth

			return M + C + P + PI;
		}

		// sun times configuration (angle, morning name, evening name)

		var times = times = [
			[-0.833, 'sunrise', 'sunset'], 
			[-0.3, 'sunriseEnd', 'sunsetStart'], 
			[-6, 'dawn', 'dusk'], 
			[-12, 'nauticalDawn', 'nauticalDusk'], 
			[-18, 'nightEnd', 'night'], 
			[6, 'goldenHourEnd', 'goldenHour']
		];
		
		function hourAngle(h, phi, d) {
			return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d)));
		}

		// returns set time for the given sun altitude
		function getSetJ(h, lw, phi, dec, n, M, L) {

			var w = hourAngle(h, phi, dec),
			    a = approxTransit(w, lw, n);
			return solarTransitJ(a, M, L);
		}

		// calculates sun times for a given date and latitude/longitude

		function getTimes(date, lat, lng) {

			var lw = rad * -lng,
			    phi = rad * lat,

			    d = toDays(date),
			    n = julianCycle(d, lw),
			    ds = approxTransit(0, lw, n),

			    M = solarMeanAnomaly(ds),
			    L = eclipticLongitude(M),
			    dec = declination(L, 0),

			    Jnoon = solarTransitJ(ds, M, L),

			    i,
			    len,
			    time,
			    Jset,
			    Jrise;

			var result = {
				solarNoon : fromJulian(Jnoon),
				nadir : fromJulian(Jnoon - 0.5)
			};

			for ( i = 0,
			len = times.length; i < len; i += 1) {
				time = times[i];

				Jset = getSetJ(time[0] * rad, lw, phi, dec, n, M, L);
				Jrise = Jnoon - (Jset - Jnoon);

				result[time[1]] = fromJulian(Jrise);
				result[time[2]] = fromJulian(Jset);
			}

			return result;
		}

	}());