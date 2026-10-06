var SPREADSHEET_ID = "1gf_6LOOyICOX3SYDSgheVG0-87bTqGaB5YV9WUDOOYc";

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    var reports = [];

    if (lastRow > 1) {
      var startRow = Math.max(2, lastRow - 14);
      var numRows = lastRow - startRow + 1;
      var values = sheet.getRange(startRow, 1, numRows, 4).getDisplayValues();

      for (var i = values.length - 1; i >= 0; i--) {
        var row = values[i];
        var date = row[0] ? String(row[0]).trim() : "";
        var task = row[1] ? String(row[1]).trim() : "";
        var startTime = row[2] ? String(row[2]).trim() : "";
        var endTime = row[3] ? String(row[3]).trim() : "";

        if (date !== "" || task !== "") {
          reports.push({
            date: date,
            task: task,
            startTime: startTime,
            endTime: endTime
          });
        }
      }
    }

    var result = {
      status: "success",
      reports: reports.slice(0, 10)
    };

    var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + JSON.stringify(result) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errObj = {
      status: "error",
      message: err.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errObj))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var date = "";
    var task = "";
    var startTime = "";
    var endTime = "";

    if (e && e.parameter) {
      date = e.parameter.date || e.parameter.DATE || "";
      task = e.parameter.task || e.parameter.TASK || "";
      startTime = e.parameter.startTime || e.parameter.start || "";
      endTime = e.parameter.endTime || e.parameter.end || "";
    }

    if (!task && e && e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        date = parsed.date || date;
        task = parsed.task || task;
        startTime = parsed.startTime || startTime;
        endTime = parsed.endTime || endTime;
      } catch (ex) {}
    }

    date = String(date || "").trim();
    task = String(task || "").trim();
    startTime = String(startTime || "").trim();
    endTime = String(endTime || "").trim();

    if (!task) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Task description cannot be empty."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheets()[0];

    sheet.appendRow([date, task, startTime, endTime]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Report saved successfully"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Unable to save report: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
