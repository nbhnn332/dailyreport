var SPREADSHEET_ID = "1gf_6LOOyICOX3SYDSgheVG0-87bTqGaB5YV9WUDOOYc";

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = params.action || "getRecent";
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheets()[0];

    // Handle delete via GET (allows JSONP / zero CORS issues)
    if (action === "delete") {
      var rowToDelete = parseInt(params.row, 10);
      if (rowToDelete && rowToDelete >= 2 && rowToDelete <= sheet.getLastRow()) {
        sheet.deleteRow(rowToDelete);
        return createOutput({ status: "success", message: "Deleted successfully" }, params.callback);
      }
      return createOutput({ status: "error", message: "Invalid row number" }, params.callback);
    }

    // Default: Return recent rows with their actual row indices
    var lastRow = sheet.getLastRow();
    var reports = [];

    if (lastRow > 1) {
      var startRow = Math.max(2, lastRow - 19);
      var numRows = lastRow - startRow + 1;
      var values = sheet.getRange(startRow, 1, numRows, 4).getDisplayValues();

      for (var i = values.length - 1; i >= 0; i--) {
        var row = values[i];
        var actualRowIndex = startRow + i;
        var date = row[0] ? String(row[0]).trim() : "";
        var task = row[1] ? String(row[1]).trim() : "";
        var startTime = row[2] ? String(row[2]).trim() : "";
        var endTime = row[3] ? String(row[3]).trim() : "";

        if (date !== "" || task !== "") {
          reports.push({
            row: actualRowIndex,
            date: date,
            task: task,
            startTime: startTime,
            endTime: endTime
          });
        }
      }
    }

    return createOutput({ status: "success", reports: reports.slice(0, 10) }, params.callback);

  } catch (err) {
    return createOutput({ status: "error", message: err.toString() }, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = params.action || "add";
    var date = params.date || "";
    var task = params.task || "";
    var startTime = params.startTime || "";
    var endTime = params.endTime || "";
    var targetRow = parseInt(params.row, 10);

    // Fallback if sent as raw JSON
    if ((!task && !targetRow) && e && e.postData && e.postData.contents) {
      try {
        var json = JSON.parse(e.postData.contents);
        action = json.action || action;
        date = json.date || date;
        task = json.task || task;
        startTime = json.startTime || startTime;
        endTime = json.endTime || endTime;
        targetRow = parseInt(json.row, 10) || targetRow;
      } catch (ex) {}
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheets()[0];

    // Handle Delete Action
    if (action === "delete") {
      if (targetRow && targetRow >= 2 && targetRow <= sheet.getLastRow()) {
        sheet.deleteRow(targetRow);
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Deleted successfully" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid row number" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Handle Edit/Update Action
    if (action === "edit" || action === "update") {
      if (!targetRow || targetRow < 2 || targetRow > sheet.getLastRow()) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid row for update" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      sheet.getRange(targetRow, 1, 1, 4).setValues([[date, task, startTime, endTime]]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Updated successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default: Add as New Row
    task = String(task || "").trim();
    if (!task) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Task description cannot be empty." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([date, task, startTime, endTime]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Report saved successfully" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Error: " + err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function createOutput(data, callback) {
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(data) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
