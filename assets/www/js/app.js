      var home;
      var errflag;
      var flag = 0;
      var db;
      var query;
      var dtable;
      var shareof = new Array();
      var nop;
      var share;
      var data;
      var csv_data;
      var db_data = {};
      var file = {};

      document.addEventListener("deviceready", onDeviceReady, false);

      function onDeviceReady() {
          db = window.openDatabase("ExpenseDB", "1.0", "ExpenseDB", 200000);
          db.transaction(openTable, errorCB);
          window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);

          // events listeners
          document.addEventListener("menubutton", onMenuKeyDown, false);
          $("#save").bind("click", saveData);
          $("#load").bind("click", viewTransactions);
          $("#export").bind("click", exportData);
          $("#import").bind("click", importData);
          var default_color = $('#import').css("background-color");
          $('#import,#export').bind('touchstart', function () {
              $(this).css('background-color', 'red');
          });

          $('#import,#export').bind('touchend', function () {
              $(this).css('background-color', default_color);
          });

          $("#records").on('change', function () {
              cal_total();
          });

          jQuery.extend(jQuery.fn.dataTableExt.oSort, {
              "date-eu-pre": function (date) {
                  var eu_date = date.split('/');
                  var year = eu_date[2];
                  var month = eu_date[0];
                  if (month.length == 1) {
                      month = 0 + month;
                  }
                  var day = eu_date[1];
                  if (day.length == 1) {
                      day = 0 + day;
                  }
                  return (year + month + day) * 1;
              },

              "date-eu-asc": function (a, b) {
                  return ((a < b) ? -1 : ((a > b) ? 1 : 0));
              },

              "date-eu-desc": function (a, b) {
                  return ((a < b) ? 1 : ((a > b) ? -1 : 0));
              }
          });

          dtable = $('#records').dataTable({
              "aaSorting": [
                  [1, 'desc']
              ],

              "aoColumnDefs": [{
                  "bVisible": false,
                  "aTargets": [0]
              }],
              "fnDrawCallback": function (oSettings) {
                  cal_total();
              },
              "bAutoWidth": false,
              "sDom": 'lf<"options">ti<"total">p',
              "aoColumns": [
                  null, {
                      sType: "date-eu"
                  },
                  null,
                  null, {
                      sType: "numeric"
                  },
              ]
          });

          $(".options").html('<button disabled="" id="btnDeleteRow">Delete</button>');
          $("#btnDeleteRow").bind("click", deleteData);

          $("#records tbody").click(function (event) {
              var oDeleteRowButton = $("#btnDeleteRow");
              if ($(event.target.parentNode).hasClass("row_selected")) {
                  $(event.target.parentNode).removeClass("row_selected");
                  oDeleteRowButton.attr("disabled", "true");
              } else {
                  $(dtable.fnSettings().aoData).each(function () {
                      $(this.nTr).removeClass("row_selected");
                  });
                  $(event.target.parentNode).addClass("row_selected");
                  oDeleteRowButton.removeAttr("disabled");
              }

          });


          var today = new Date();
          document.getElementById("date").valueAsDate = today;
          var dd = 1; //start from day 1 of the month
          var mm = today.getMonth(); //January is 0!
          var yyyy = today.getFullYear();
          mm = (mm + 1) % 12;
          if (mm == 0) {
              mm = 12;
          }
          var from_date = yyyy + '-' + mm + '-' + dd;
          var date = new Date(from_date);
          document.getElementById("from").valueAsDate = date;
          if (mm == 12) {
              mm = 0;
              yyyy = yyyy + 1;
          }
          var to_date = yyyy + '-' + (mm + 1) + '-' + dd;
          date = new Date(to_date);
          document.getElementById("to").valueAsDate = date;
          viewTransactions();
          setTimeout(function () {
              navigator.splashscreen.hide();
          }, 2000);
      }

      function cal_total() {
          var total = 0;
          $("#records tr td:nth-child(4)").each(function (index, element) {
              total += parseInt($(element).text());
          });
          $(".total").html('<span  style="font-size:0.80em;"><strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Total : </strong>' + total.toFixed(2) + '</span>');
      }

      function saveData() {
          errflag = 0;
          var date = new Date($("#date").val());
          date = date.getTime();
          var paidby = $("#paidby").val();
          var paidfor = $("#paidfor").val();
          var amount = parseFloat($("#amount").val());
          amount = amount.toFixed(2);
          var paidto = $("#paidto").val();

          if (paidby == "" || paidfor == "" || amount == "" || paidto == "") {
              toast.show("All fields are required !", 1);
              return;
          } else {
              paidby = paidby.toLowerCase();
              paidby = paidby[0].toUpperCase() + paidby.slice(1);
              paidto = paidto.toLowerCase();
              paidto = paidto[0].toUpperCase() + paidto.slice(1);
              if (paidto == "Team") {
                  query = "insert into Expense (Date,PaidBy,PaidFor,Amount) values (" + date + ",'" + paidby + "','" + paidfor + "'," + amount + ");";
              } else {
                  query = "insert into Expense (Date,PaidBy,PaidTo,PaidFor,Amount) values (" + date + ",'" + paidby + "','" + paidto + "',         '" + paidfor + "'," + amount + ");";
                  if (shareof[paidto] >= 0) {
                      // alert("avail");
                  } else {
                      navigator.notification.confirm(
                          'You are about to add new team member ?',
                          newMemberConfirm,
                          'New member ?',
                          'Add,NotNow,Cancel'
                      );
                      return;
                  }
              }
              db.transaction(insertRecord, errorCB);
          }
      }

      function newMemberConfirm(buttonIndex) {
          if (buttonIndex == 1) {
              db.transaction(insertRecord, errorCB);
              db.transaction(insertNew, errorCB);
          }
          if (buttonIndex == 2) {
              db.transaction(insertRecord, errorCB);
          }
      }

      function insertNew(tx) {
          var date = new Date($("#date").val());
          date = date.getTime();
          var paidby = $("#paidto").val();
          tx.executeSql("insert into Expense (Date,PaidBy,PaidFor,Amount) values (" + date + ",'" + paidby + "','nothing',0);");
      }

      function deleteData() {
          var id = $('table tr.row_selected').attr("id");
          if (id > 0) {
              query = "delete from Expense where id=" + id + ";";
              navigator.notification.confirm(
                  'You are about to Delete !',
                  deleteConfirm,
                  'Delete ?',
                  'Yes,No'
              );
          } else {
              $("#btnDeleteRow").attr("disabled", "true");
          }
      }

      function onMenuKeyDown() {
          $("#impPopup").popup("close");
          $("#cPopup").popup("close");
          if ($(".ui-panel").hasClass("ui-panel-open") == true) {
              $("#menupanel").panel("close");
          } else {
              $("#menupanel").panel("open");
          }
      }

      function insertRecord(tx) {
          tx.executeSql(query);
          toast.show("Record Saved Successfully !", 1);
          viewTransactions();
      }

      function deleteConfirm(index) {
          if (index == 1) {
              db.transaction(deleteRecord, errorCB);
          }
      }

      function deleteRecord(tx) {
          tx.executeSql(query);
          viewTransactions();
          toast.show("Record Deleted Successfully !", 1);
      }


       //create table Expense
      function openTable(tx) {
          tx.executeSql('CREATE TABLE IF NOT EXISTS Expense (id INTEGER PRIMARY KEY AUTOINCREMENT,Date Number NOT NULL, PaidBy TEXT NOT NULL, PaidFor TEXT NOT NULL,PaidTo TEXT NOT NULL DEFAULT "All",Amount Number NOT NULL)');
      }

       //function will be called when an error occurred
      function errorCB(err) {
          toast.show("Error in Data !", 1);
      }

      function viewTransactions() {
          var from = new Date($("#from").val());
          from_epoch = from.getTime();
          var to = new Date($("#to").val());
          to_epoch = to.getTime();

          query = 'SELECT * FROM Expense where Date between ' + from_epoch + ' and ' + to_epoch + ';';
          db.transaction(queryDB, errorCB);
      }

      function exportData() {
          $('#export').addClass("row_selected");
          $('#export').removeClass("row_selected");
          $("#menupanel").panel("close");
          toast.show("Exporting ..", 0);
          db.transaction(reteriveAll, errorCB);
      }

      function reteriveAll(tx) {
          tx.executeSql('select * from Expense;', [], exportResult, errorCB);
      }

      function exportResult(tx, result) {
          var no_of_records = result.rows.length;
          csv_data = '"Date","PaidBy","PaidFor","PaidTo","Amount"\n';
          for (var i = 0; i < no_of_records; i++) {
              var date_epoch = result.rows.item(i).Date;
              var d = new Date(date_epoch);
              var date = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
              var paidby = result.rows.item(i).PaidBy;
              var paidfor = result.rows.item(i).PaidFor;
              var paidto = result.rows.item(i).PaidTo;
              var amount = result.rows.item(i).Amount;
              csv_data = csv_data + '"' + date + '","' + paidby + '","' + paidfor + '","' + paidto + '","' + amount + '"\n';
          }
          file.fs.root.getFile("ExpenseBackup.csv", {
              create: true,
              exclusive: false
          }, gotFileEntry, fail);
          file.writer.write(csv_data);
          toast.show("File backuped to " + file.fileobj.fullPath, 1);
      }

      function importData() {
          $("#menupanel").panel("close");
          $("#impPopup").popup("open");
          $("#import_button").bind("click", startImport);
          $("#file1").bind("change", FileChanged);
      }

      function FileChanged() {
          var fobj = document.getElementById('file1').files[0];
          if (typeof fobj != "undefined") {
              var ext = fobj.name.match(/\.[a-z]{3,3}$/gi);
              if (ext == null || ext[ext.length - 1].toLowerCase() != ".csv") {
                  toast.show("CSV File Required", 1);
                  $("#filename").html("No file chosen");
                  $("#file1").val("");
                  $("#import_button").addClass('ui-disabled');
                  return;
              }
              $("#filename").html(fobj.name);
              $("#import_button").removeClass('ui-disabled');
          } else {
              $("#filename").html("No file chosen");
              $("#import_button").addClass('ui-disabled');
          }
      }

      function startImport() {
          toast.show("Importing .. !", 0);
          var fobj = document.getElementById('file1').files[0];
          if (fobj) {
              var reader = new FileReader();
              var raw_data;
              reader.onloadend = function (evt) {
                  raw_data = evt.target.result;
                  //import mechanism
                  var contents = raw_data.split("\n");
                  db_data = {};
                  for (var i = 1; i < contents.length; i++) {
                      if (!contents[i] || contents[i] == "") {
                          continue;
                      }
                      contents[i] = contents[i].slice(1);
                      contents[i] = contents[i].slice(0, (contents[i].length - 1));
                      var line = contents[i].split(/","/);

                      if (line.length == 4 || line.length == 5) {
                          var date_string = line[0].split('/');
                          if (date_string.length == 3) {
                              var date = new Date(date_string[2] + "-" + date_string[0] + "-" + date_string[1]);
                              date = date.getTime();
                              var paidby = line[1];
                              paidby = paidby.toLowerCase();
                              paidby = paidby[0].toUpperCase() + paidby.slice(1);
                              var paidfor = line[2];
                              var paidto = line[3];
                              paidto = paidto.toLowerCase();
                              paidto = paidto[0].toUpperCase() + paidto.slice(1);
                              var amount = line[4];
                              amount = parseFloat(amount).toFixed(2);

                              db_data[i] = "insert into Expense (Date,PaidBy,PaidFor,PaidTo,Amount) values (" + date + ",'" + paidby + "','" + paidfor + "','" + paidto + "'," + amount + ");";
                          } else {
                              toast.show("Error in line : " + i, 1);
                              return;
                          }
                      } else {
                          toast.show("Error in line : " + i, 1);
                          return;
                      }
                  }

                  db.transaction(importALL, errorCB);
              };
              reader.readAsText(fobj);
          } else {
              toast.show("CSV file required ! ", 1);
          }

      }

      function importALL(tx) {
          for (var i = 1; i <= Object.keys(db_data).length; i++) {
              tx.executeSql(db_data[i]);
          }
          viewTransactions();
          toast.show("Imported Successfully !", 1);
      }

      function queryDB(tx) {
          tx.executeSql(query, [], querySuccess, errorCB);
      }

      function querySuccess(tx, result) {
          var len = result.rows.length;
          dtable.fnClearTable();
          data = "Date     PaidBy      PaidFor        Amount \n";
          var status = new Array();
          shareof = [];
          var loan = new Object;
          var items = new Array();
          $("#details").html("");
          if (len > 0) {
              for (var i = 0; i < len; i++) {
                  var date_epoch = result.rows.item(i).Date;
                  var d = new Date(date_epoch);
                  var date = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
                  var paidby = result.rows.item(i).PaidBy;
                  var paidto = result.rows.item(i).PaidTo;

                  var paidfor = result.rows.item(i).PaidFor;
                  var amount = result.rows.item(i).Amount;
                  var id = result.rows.item(i).id;

                  if (paidto != "All") {
                      var key1 = paidto + "^" + paidby;
                      var key2 = paidby + "^" + paidto;
                      if (typeof (loan[key1]) == "undefined") {
                          loan[key1] = 0;
                      }
                      loan[key1] += amount;
                      if (typeof (loan[key2]) != "undefined") {
                          loan[key2] = loan[key2] - loan[key1];
                          if (loan[key2] == 0) {
                              delete loan[key1];
                              delete loan[key2];
                          }
                          if (loan[key2] < 0) {
                              loan[key1] = (loan[key2] * -1);
                              delete loan[key2];
                          } else {
                              delete loan[key1];
                          }
                      }
                  } else {
                      if (!status[paidby]) {
                          status[paidby] = 0;
                      }
                      status[paidby] += amount;
                      if (!items[paidfor]) {
                          items[paidfor] = 0;
                      }
                      items[paidfor] += amount;
                  }
                  data = data + date + " " + paidby + " " + paidfor + " " + amount + "\n";
                  var addId = dtable.fnAddData([id, date, paidby, paidfor, amount]);
                  var theNode = dtable.fnSettings().aoData[addId[0]].nTr;
                  theNode.setAttribute('id', id);
              }
              data = data + "\n\n Share Contribution \n------------------\n\n";
              var amt = 0;
              for (var i in status) {
                  amt = amt + status[i];
                  shareof[i] = status[i];
                  data = data + i + 'has spent to team ' + status[i] + 'INR\n';
                  $("#details").append('<li><b>' + i + '</b> has spent to team ' + status[i] + ' INR</li>');
              }


              for (var i in loan) {
                  var name = i.split('^');
                  if (name[0] == name[1]) {
                      data = data + name[0] + ' has spent ' + loan[i] + 'INR for himself \n';
                      $("#details").append('<li><b>' + name[0] + '</b> has spent ' + loan[i] + ' INR for himself </li>');
                  } else {
                      data = data + name[0] + ' need to give ' + loan[i] + 'INR to ' + name[1] + '\n';
                      $("#details").append('<li id="' + i + '"><b>' + name[0] + '</b> need to give ' + loan[i] + ' INR to ' + name[1] + '</li>');
                  }
              }
              if (amt != 0) {
                  $("#details").append('<li><b>Total amount spent to team </b> = ' + amt + ' INR</li>');
                  data = data + 'Total amount spent to team = ' + amt.toFixed(2) + ' INR\n';
                  nop = Object.keys(status).length;
                  share = amt / nop;
                  if (nop > 1) {
                      $("#details").append('<li>Individual share</b> = ' + share.toFixed(2) + ' INR</li>');
                      data = data + 'Individual share =  ' + share.toFixed(2) + ' INR';
                  }
              }
              if (nop > 1) {
                  $("#details").append('<li><center><input id="calc" type="button" value="Calculate common expense"></input><input id="savereport" type="button" value="Save report"></input></center></li>');
                  var calc_button = document.getElementById("calc");
                  calc_button.addEventListener("click", call_calc_popup);
              } else {
                  $("#details").append('<li><center><input id="savereport" type="button" value="Save report"></input></center></li>');
              }
              var download_button = document.getElementById("savereport");
              download_button.addEventListener("click", saveReport);

              $('#details').listview('refresh');
              $("#paidby").autocomplete({
                  minLength: 1,
                  source: Object.keys(status)
              });

              $("#paidto").autocomplete({
                  minLength: 1,
                  source: Object.keys(status)
              });

              $("#paidfor").autocomplete({
                  minLength: 1,
                  source: Object.keys(items)
              });
              dtable.fnDraw();
              dtable.yadcf([{
                  column_number: 2,
                  filter_container_id: 'paidby_container',
                  filter_default_label: 'All'

              }, {
                  column_number: 3,
                  filter_container_id: 'paidfor_container',
                  filter_default_label: 'All'

              }]);
              cal_total();

              var ir_data = [];
              for (var i in items) {
                  var amt = items[i];
                  ir_data.push([amt, i]);
              }

              var cr_data = [];
              for (var i in shareof) {
                  var amt = shareof[i]
                  cr_data.push([i + "\(" + amt + " INR\)", amt]);
              }
              $("#item-report").html("");
              $("#user-report").html("");
              var plot1 = $.jqplot('item-report', [
                  //   [ [10,"oranges"], [20,"apples"], [30,"bananas"],[50,"Food"],[1000,"Movie"] ]
                  ir_data
              ], {
                  title: "Item wise report",
                  seriesDefaults: {
                      renderer: $.jqplot.BarRenderer,
                      pointLabels: {
                          show: true,
                          location: 'e',
                          edgeTolerance: -15
                      },
                      shadowAngle: 135,
                      rendererOptions: {
                          barDirection: 'horizontal'
                      }
                  },
                  axesDefaults: {
                      tickRenderer: $.jqplot.CanvasAxisTickRenderer,
                      tickOptions: {
                          angle: -90,
                          fontSize: '10pt'
                      }
                  },
                  axes: {
                      xaxis: {
                          //   label:'Amount spent (INR)',
                      },

                      yaxis: {
                          //label:'Items',
                          tickOptions: {
                              fontSize: '10pt',
                              fontFamily: 'Tahoma',
                              angle: 0
                          },
                          renderer: $.jqplot.CategoryAxisRenderer,
                      },
                  }
              });


              var plot2 = jQuery.jqplot('user-report', [cr_data], {
                  title: "Contribution chart",
                  seriesDefaults: {
                      renderer: jQuery.jqplot.PieRenderer,
                      rendererOptions: {
                          sliceMargin: 4,
                          showDataLabels: true
                      }
                  },
                  legend: {
                      show: true,
                      location: 'e'
                  }
              });
          }
      }


      function saveReport() {
          file.fs.root.getFile("Report.txt", {
              create: true,
              exclusive: false
          }, gotFileEntry, fail);
          file.writer.write(data);
          toast.show("Report Saved to the " + file.fileobj.fullPath, 1);
      }

      function gotFS(fileSystem) {
          file.fs = fileSystem;
      }

      function call_calc_popup() {
          $("#cPopup").popup("open");
          $("#calc_button").bind("click", calcCommonExpense);
      }

      function gotFileEntry(fileEntry) {
          file.fileobj = fileEntry;
          fileEntry.createWriter(gotFileWriter, fail);
      }

      function gotFileWriter(writer) {
          file.writer = writer;
      }

      function fail(error) {
          toast.show("File operation failed !", 1);
          console.log("------ " + error.code);
      }


      function calcCommonExpense() {
          var teampay = ($("#teampay").val() / nop) + share;
          $("#contribution").html("");
          for (var i in shareof) {
              if ((teampay - shareof[i]) < 0) {
                  $("#contribution").append('<li><b>' + i + '</b> need to get ' + (((teampay - shareof[i]) * -1).toFixed(2)) + ' INR</li>');
              } else {
                  $("#contribution").append('<li><b>' + i + '</b> need to pay ' + (teampay - shareof[i]).toFixed(2) + ' INR</li>');
              }
          }
          $('#contribution').listview('refresh');
      }
