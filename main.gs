/*
Import: Admin Reports API [https://developers.google.com/apps-script/advanced/admin-sdk-reports]
*/

var APPNAME = "Meet Résztvevők";
var actUser = Session.getActiveUser().getEmail();
var devUser = Session.getEffectiveUser().getEmail();
var timeDiff = 2;

function doGet(e) {
  var params = JSON.stringify(e);
  var paramDatas;
  if (params) {
    paramDatas = JSON.parse(params);
    paramName = (paramDatas.parameter.paramName) ? paramDatas.parameter.paramName : '';
  }
  var t = HtmlService.createTemplateFromFile('index');
  t.data = params;
  var ts = t.evaluate();
  var th = HtmlService.createHtmlOutput(ts);
  th.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  th.setTitle(APPNAME);
  return th;
}

function dayForm() {
  var now = new Date();
  var _now = dateToString(now)[0].split("T")[0];
  var _S = "";
  _S += "<h1>Meet szervező: " + actUser + "</h1>";
  _S += "<form onsubmit='changeDay()'>";
  _S += "<label for='meetDay'>Válaszd ki a Meet dátumát:</label>";
  _S += "<input type='date' id='meetDay' name='meetDay' oninput='changeDay(this)' value='" + _now + "' >";
  _S += "<form>";
  return _S;
}

function listMyMeets(day) {
  // universal settings - static
  var _S = "";
  var now ;
  if (day != undefined){
    now = new Date(day);
  } else {
    now = new Date();
  }
  var startDate = dateToString(now)[0];
  var endDate = dateToString(now)[1];
  var userKey = 'all';
  var organizerEMail = actUser;
  var applicationName = 'meet';
  var optionalArgs = {
    eventName: "call_ended",
    startTime: "" + startDate,
    endTime: "" + endDate,
    filters: "organizer_email==" + organizerEMail + ",identifier_type==email_address" + ",identifier==" + actUser
  };
  try {
    var response = AdminReports.Activities.list(userKey, applicationName, optionalArgs);
    var activities = response.items;
    if (activities == null) {
      _S += "A " + day + " napon nem volt Meet!";
    } else {
      var activitiesCount = activities.length;
      _S += "<table>";
      _S += "<thead>";
        _S += "<tr>";
        _S += "<th>Dátum</th>";
        _S += "<th>Kezdés</th>";
        _S += "<th>Zárás</th>";
        _S += "<th>Tartam<br>(mm:ss)</th>";
        _S += "<th>Meet Kód<br><span class='small'>Meet ID</span></th>";
        _S += "<th>Résztvevők</th>";
      if (actUser == devUser){
        _S += "<th>Minőségellenőrés (admin)</th>";
      }
        _S += "</tr>";
      _S += "</thead>";
      _S += "<tbody>";
      for (var i = 0; i < activitiesCount; i++){
        var _endDate = "";
        var duration_seconds = 0;
        var meeting_code = "";
        var conference_id = "";
        for (var j = 0; j < activities[i].events[0].parameters.length; j++){
          var parameterName = activities[i].events[0].parameters[j].name;
          switch (parameterName) {
            case "duration_seconds" :
              duration_seconds = activities[i].events[0].parameters[j].intValue;
              break;
            case "meeting_code" :
               meeting_code = activities[i].events[0].parameters[j].value;
              break;
            case "conference_id" :
              conference_id = activities[i].events[0].parameters[j].value;    
              break;
            default:
              break;
          }
        }
        // a végzés idejéből és az időtartamból visszaszámoljuk a kezdés idejét
        var _endDateTime = new Date(activities[i].id.time);
        var _endDateTimeMilliseconds = _endDateTime.getTime();
        var _startDateTimeMilliseconds = _endDateTimeMilliseconds - duration_seconds*1000;
        var _startDateTime = new Date(_startDateTimeMilliseconds);
        var _startTimeUTCString = Utilities.formatDate(_startDateTime, "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
        
        _S += "<tr>";
        _S += "<td>" + getDate(activities[i].id.time)[0] + "</td>"; // dátum
        _S += "<td>" + getDate(_startTimeUTCString)[1] + "</td>"; // kezdés ideje
        _S += "<td>" + getDate(activities[i].id.time)[1] + "</td>"; // végzés ideje
        _S += "<td>" + getMinutes(duration_seconds) + "</td>"; // időtartam
        _S += "<td>" + meeting_code + "<br><span class='small'>" + conference_id + "<span></td>";
        _S += "<td><button type='button' class='button' onclick='listMeetAttendances(\"" + meeting_code + "\", \"" + conference_id + "\")'>Résztvevők listája</a></td>";    
        if (actUser == devUser) {
          _S += "<td><a class='button' target='meetAdmin' href='https://meet.google.com/tools/quality/admin/meeting/" + conference_id +"'>" + conference_id + "</a></td>";
        }
        _S += "</tr>";
      };
      _S += "</tbody>";
      _S += "</table>";
    };
  } catch (err) {
    _S += "<div class='error'><h1>Hiba lépett fel!</h1><code><pre>" + err + "</pre></code><p>Kérlek küld el ezt a hibaüzenetet a fejlesztőnek a <pre>" + devUser +"</pre> email címre!</p>";
    Logger.log(err);
  } // try
  return _S;
}

function dateToString(date){
  var startTime = "00:00:00.000Z";
  var endTime = "23:59:59.000Z";
  var YY = date.getUTCFullYear();
  var MM = date.getUTCMonth() + 1;
  var DD = date.getUTCDate();
  var hh = date.getUTCHours();
  var mm = date.getUTCMinutes();
  var _date = "" + YY;
  _date += "-";
  _date += (MM < 10) ? "0" + MM : "" + MM;
  _date += "-";
  _date += (DD < 10) ? "0" + DD : "" + DD;
  var startDate = _date + "T" + startTime;
  var endDate = _date + "T" + endTime;
  return [startDate, endDate];
}

function getDate(myDate){
  // 2020-05-07T10:52:00.526Z
  var _date = myDate.split("T")[0];
  var _time = myDate.split("T")[1];
  _date = _date.replace(/-/g, ".");
  var _hour = parseInt(_time.substring(0,2)) + timeDiff;
  var _minute = parseInt(_time.substring(3,5));
  _time = "";
  _time += (_hour < 10) ? "0" + _hour : _hour.toString();
  _time += ":";
  _time += (_minute < 10) ? "0" + _minute : _minute.toString();
  return [_date,_time];
}

function getMinutes(myDuration){
  // 2020-05-07T10:52:00.526Z
  var _minutes = "";
  _minutes += (Math.round(myDuration / 60) <10) ? "0" + (Math.round(myDuration / 60)) :  (Math.round(myDuration / 60));
  _minutes += ":";
  _minutes += (myDuration % 60 <10) ? "0" + (myDuration % 60) :  (myDuration % 60);
  return _minutes;
}

function secToMin(sec){
  // 
  var min = "";
  min += (Math.round(sec / 60) <10) ? "0" + (Math.round(sec / 60)) :  (Math.round(sec / 60));
  min += ":";
  min += (sec % 60 <10) ? "0" + (sec % 60) :  (sec % 60);
  return min;
}

function displayName(fullName, swap){
  var _fullName = "";
  if (swap) {
    var lastSpace = fullName.lastIndexOf(" ");
    var _fullName = fullName.substring(lastSpace) + " " + fullName.substring(0, lastSpace);
  } else {
    _fullName =  fullName;
  }
  return _fullName;
}


/*
  Description: Checks the Meet for attendance of the given student
  @param {String} meetCode - Raw Meet Code from Course Sheet
  @param {Integer} index - Index corresponding to the Student's row
  in the Course Sheet
*/
function checkMeet(meetCode, conference_id) {
  // universal settings - static
  var _S = "";
  var userKey = 'all';
  var applicationName = 'meet';
  var optionalArgs = {
    event_name: "call_ended",
    filters: "meeting_code==" + meetCode + ",conference_id==" + conference_id
    
  };
  try {
    var response = AdminReports.Activities.list(userKey, applicationName, optionalArgs);
    var activities = response.items;
    if (activities == null) {
      _S += "A " + meetCode + " ["+ conference_id +"] kódú Meet-en nem vett részt senki!";
    }
    else 
    {
      _S += "<h2>" + meetCode + " ["+ conference_id +"] azonosítójú Meet résztvevői</h2>";
      _S += "<table class='list'>";
      _S += "<thead>";
      _S += "<tr>";
      _S += "<th>Résztvevő neve</th>";
      _S += "<th>eMail címe</th>";
      _S += "<th>Kezdőidőpont</th>";
      _S += "<th>Időtartam<br>(mm:ss)</th>";
      _S += "<th>Becsatlakozások száma</th>";
      _S += "</tr>";
      _S += "</thead>";
      _S += "<tbody>";
      // egy résztvevő többször is szerepelhet, ezért le kell tárolni
      var attendances = [];
      // kapott eredménylista
      for (i in response.items){
        var attendance_datetime = new Date(response.items[i].id.time);
        var meetEvents = response.items[i].events;
        // kapott eredménylista eseményei
        for (j in meetEvents){
          
          var meetEventParameters = meetEvents[j].parameters;
          var attendance_identifier = "";
          var attendance_display_name = "";
          // kapott eredménylista eseményeinek paraméterei
          for (k in meetEventParameters){
            var param = meetEventParameters[k];
            var param_name = param.name;
            switch (param_name){
              case "duration_seconds":
                duration_seconds = param.intValue;
                break;
              case "identifier" :
                attendance_identifier = param.value;
                break;
              case "display_name":
                attendance_display_name = param.value;
                break;
              case "datetime":
                attendance_datetime = param.value;
                break;
            }
          }
          // ha még nem lett letárolva, letároljuk, különben hozzáadjuk
          var curAttendanceIndex = -1;
          var curAttendanceCount = 1;
          for (s in attendances){
            if (attendances[s].attendance_identifier == attendance_identifier) {
              curAttendanceIndex = s;
            }
          }
          //_S += "<span>[" + curAttendanceIndex + "]<span>";
          if (curAttendanceIndex < 0){
            attendances.push({
              "attendance_identifier":attendance_identifier, 
              "attendance_display_name": attendance_display_name, 
              "duration_seconds" : parseInt(duration_seconds),
              "first_connecting_time" : attendance_datetime.getTime() - parseInt(duration_seconds)*1000,
              "connecting_count" : parseInt(curAttendanceCount),
            });
          } else {
            // meg kell nézni, hogy az számított kezdési idő előbbi, mint az előzőleg letárolt

            var prev_first_connecting_time = parseInt(attendances[curAttendanceIndex].first_connecting_time);
            var curr_first_connecting_time = attendance_datetime.getTime() - parseInt(duration_seconds)*1000;
            if (prev_first_connecting_time > curr_first_connecting_time) {
              attendances[curAttendanceIndex].first_connecting_time = curr_first_connecting_time;
            }

            // módosítani kell a duration értéket értéket
            attendances[curAttendanceIndex].duration_seconds += parseInt(duration_seconds);
            attendances[curAttendanceIndex].connecting_count++;
                        
          }
                              
          
          
        }
        // itt nincs semmi különös, mert egy résztvevő többször is szerepelhet, azt az eseménynél kezeljük le
      }
      
      // rendezzük az eredményt név szerint
      attendances.sort(compare);
      // kiiratjuk az eredményt
      for (var i in attendances){
        if (attendances[i].attendance_identifier != actUser) {
          var _startDateTime = new Date(attendances[i].first_connecting_time);
          var _startTimeUTCString = Utilities.formatDate(_startDateTime, "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
          _S += "<tr>";
          _S += "<td class='left'>" + displayName(attendances[i].attendance_display_name, true) + "</td>"; // név
          _S += "<td class='left'>" + attendances[i].attendance_identifier +  "</td>"; // email
          _S += "<td class='center'>" + getDate(_startTimeUTCString)[1] + "</td>"; // első becsatlakozás időpontja
          _S += "<td class='center'>" + secToMin(attendances[i].duration_seconds) + "</td>"; // időtartam
          _S += "<td class='center'>" + attendances[i].connecting_count + "</td>"; // becsatlakozások száma
          _S += "</tr>";
        }
      }
      _S += "</table>";
    }
  } catch (err) {
    _S += "<div class='error'><h1>Hiba lépett fel!</h1><code><pre>" + err + "</pre></code><p>Kérlek küld el ezt a hibaüzenetet a fejlesztőnek a <pre>" + devUser +"</pre> email címre!</p>";
    Logger.log(err);
  } // try
  return _S;  
}

/* compare for object
*/
function compare(a, b) {
  // Use toUpperCase() to ignore character casing
  const bandA = a.attendance_identifier;
  const bandB = b.attendance_identifier;

  var comparison = 0;
  if (bandA > bandB) {
    comparison = 1;
  } else if (bandA < bandB) {
    comparison = -1;
  }
  return comparison;
}

/*
  Description: Strips any "-' Characters to match needed format
  for Reports API
  @param {String} meetCode - Raw Meet Code from Course Sheet
*/
function getCleanCode(meetCode) {
  var meetCodeClean;
  try{
    meetCodeClean = meetCode.replace(/-/g,"");
  } catch (err) { 
    meetCodeClean = meetCode; 
  }
  return meetCodeClean;
}

