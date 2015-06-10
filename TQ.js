/*
Copyright (c) 2015 Sam Blazes

NOTE:
This is written using the Google Apps Script API,
and will therefore only run as a Google Apps Script
*/

var fields = {/*'in_reply_to_screen_name': true, 'created_at': true,*/ 'text': true, 'in_reply_to_status_id_str':true, /*'id_str':true*/};

var TWITTER_CONSUMER_KEY = "TwitterConsumerKey";
var TWITTER_CONSUMER_SECRET = "TwitterConsumerSecret";
//var properties = PropertiesService.getDocumentProperties();
var options = {
  "oAuthServiceName" : "twitter",
  "oAuthUseToken" : "always"/*,
  "exclude_replies" : "true",
  "inlude_rts" : "false"//*/
};

function doGet() {
  
  var app = UiApp.createApplication();
  var txt;
  
  var pnl = app.createVerticalPanel().setId('AppPanel');
  pnl.add(app.createLabel('Spreadsheet URL:').setId('lblURL'));
  pnl.add(txt = app.createTextBox()
          .setWidth(200).setHeight(20)
          .setId('doc')
          .setName('doc')
          .setTitle('Open Doc')
          .setText('Enter Document Url')
         );
  pnl.add(
    app.createButton("Open Doc", 
                     app.createServerHandler('openDoc').addCallbackElement(txt)
                    ).setId('btnOpen')
  );
  
  app.setTitle('Twitter Quiz');
  app.add(pnl);
  
  return app;
};

function openDoc(e) {
  var ss;
  try {
    Logger.log(e);
    ss = SpreadsheetApp.openByUrl(e.parameter.doc);
    SpreadsheetApp.setActiveSpreadsheet(ss);
  } catch (e) {
    Logger.log(e);
    return UiApp.getActiveApplication();
  }
  
  PropertiesService.getUserProperties().setProperty('doc_url', e.parameter.doc);
  
  var app = UiApp.getActiveApplication();
  var pnl = app.getElementById('AppPanel');
  pnl.clear();
  
  var hBDate = app.createServerHandler("bDateUpdate").addCallbackElement(app.getElementById('doc'));
  var hEDate = app.createServerHandler("eDateUpdate").addCallbackElement(app.getElementById('doc'));
  var hUpSht = app.createServerHandler("updateSheet").addCallbackElement(app.getElementById('doc'));
  
  pnl.add(app.createLabel('Begin Date:').setId('lblB'));
  pnl.add(app.createDateBox().addValueChangeHandler(hBDate).setId("bdate").setTitle('Begin Date'));
  
  pnl.add(app.createLabel('End Date:').setId('lblE'));
  pnl.add(app.createDateBox().addValueChangeHandler(hEDate).setId("edate").setTitle('End Date'));
  
  pnl.add(app.createButton('Update', hUpSht).setId('lblUp'));
  
  pnl.add(app.createButton('Back', app.createServerHandler('mainpage')));
  
  return app;
};

function mainpage(e) {
  var app = UiApp.getActiveApplication();
  var txt;
  
  var pnl = app.getElementById('AppPanel');
  pnl.clear();
  pnl.add(app.createLabel('Spreadsheet URL:').setId('lblURL'));
  pnl.add(txt = app.createTextBox()
          .setWidth(200).setHeight(20)
          .setId('doc')
          .setName('doc')
          .setTitle('Open Doc')
          .setText('Enter Document Url')
         );
  pnl.add(
    app.createButton("Open Doc", 
                     app.createServerHandler('openDoc').addCallbackElement(txt)
                    ).setId('btnOpen')
  );
  return app;
};
                          

function bDateUpdate(e) {
  SpreadsheetApp.openByUrl(PropertiesService.getUserProperties().getProperty('doc_url')).getRange('b1').setValue(e.parameter.bdate);
  return UiApp.getActiveApplication();
};

function eDateUpdate(e) {
  SpreadsheetApp.openByUrl(PropertiesService.getUserProperties().getProperty('doc_url')).getRange('c1').setValue(e.parameter.edate);
  return UiApp.getActiveApplication();
};

function setUser()
{
  oauthSetup();
  var properties = PropertiesService.getUserProperties();
  options['muteHttpExceptions'] = true;
  var jsonusrdata = UrlFetchApp.fetch("https://api.twitter.com/1.1/account/verify_credentials.json", options).getContentText();
  var usr_data = Utilities.jsonParse(jsonusrdata);
  //properties.setProperty('usr_id', usr_data['id_str']);
  Logger.log(usr_data['name']);
  return {usr_id:usr_data['id_str'], numstats:usr_data['statuses_count']};
};

function oauthSetup()
{
  // Setup OAuthServiceConfig
  var oAuthConfig = UrlFetchApp.addOAuthService("twitter");
  oAuthConfig.setAccessTokenUrl("https://api.twitter.com/oauth/access_token");
  oAuthConfig.setRequestTokenUrl("https://api.twitter.com/oauth/request_token");
  oAuthConfig.setAuthorizationUrl("https://api.twitter.com/oauth/authorize");
  var scrpt_prop = PropertiesService.getScriptProperties();
  oAuthConfig.setConsumerKey(scrpt_prop.getProperty(TWITTER_CONSUMER_KEY));
  oAuthConfig.setConsumerSecret(scrpt_prop.getProperty(TWITTER_CONSUMER_SECRET));
};

function strLessThan(a, b)
{
  if (a.lenght < b.length)
  {
    return strLessThan(b, a);
  }
  else
  {
    Logger.log('StrComparing: L: %s Added: "%s"', a.length-b.length, new Array(a.length-b.length).join(' '))
    return ((a) < (new Array(a.length-b.length).join(' ')+b));
  }
}

function try_fetch(query, op, max)
{
  var ret = null;
  for(var t = true, i = 0; t && i != max; i++){
    try {
      ret = Utilities.jsonParse(UrlFetchApp.fetch(query, op).getContentText());
      t = false;
    } catch (e) {
      Logger.log(e);
      oauthSetup();
      t = true;
    }
  }
  return ret;
};

function GetQuestions(bdate, edate, usr_id, numstats)
{
  oauthSetup();
  var ret = {}
  var ops = {
    "oAuthServiceName" : "twitter",
    "oAuthUseToken" : "always",
    'muteHttpExceptions' : true
  };
  var count_str = "200";
  var max_id = -1;
  var max_id_str = "";
  var min_id = 1;
  var min_id_str = "1";
  var idx = 1;
  
  var Q = [];
  /*
  for(var t = true; t;){
    try {
      Q = Utilities.jsonParse(UrlFetchApp.fetch("https://api.twitter.com/1.1/statuses/user_timeline.json?count=3&since_id=1", ops).getContentText());
      t = false;
    } catch (e) {
      //oauthSetup();
      t = true;
    }
  }
  */
  Q = try_fetch("https://api.twitter.com/1.1/statuses/user_timeline.json?count="+ count_str +"&since_id="+ min_id_str, ops, 16);
  if (Q == null)
  {
    Logger.log("Failed");
    return null;
  }
  
  Logger.log(Q.length);
  var i = 0;
  ops.max_id = Q[0].id;
  var LastMaxID = max_id;
  //delete ops.since_id;
  do
  {
    LastMaxID = max_id;
    Logger.log(Q.length);
    for (var x in Q)
    {
      //if(Q[x].id >= ops.since_id) {
        //ops.since_id = Q[x].id;
      //}
      Logger.log("\t\t\tIDstr=%s", Q[x].id_str);
      if(Q[x].id < max_id || max_id == -1) {
        max_id = Q[x].id;
        max_id_str = Q[x].id_str;
      }
      if(Q[x]['text'].indexOf('[Q]') != -1) {
        var date = Date.parse(Q[x].created_at);
        Logger.log("\t-> %s", Q[x]['text']);
        if((date > bdate || bdate == NaN) && (date < edate || edate == NaN) && !(Q[x]['id_str'] in ret)) {
          ret[Q[x]['id_str']]={text:Q[x]['text'], index:idx};
          idx++;
        }
      }
    }
    //debugging line
    Logger.log('New id range: [%s, %s]', min_id, max_id);
    Utilities.sleep(1000);
    Logger.log("\t\t%s", max_id);
    Q = try_fetch("https://api.twitter.com/1.1/statuses/user_timeline.json?count="+ count_str +"&since_id="+ min_id_str +"&max_id="+ max_id_str, ops, 16);
    /*
    for(var t = true; t;){
      try {
        Q = Utilities.jsonParse(UrlFetchApp.fetch("https://api.twitter.com/1.1/statuses/user_timeline.json?count=10&max_id={ID}".format('{ID}', ops.max_id), ops).getContentText());
        t = false;
      } catch (e) {
        //oauthSetup();
        t = true;
      }
    }
    //*/
    i++;
  } while (LastMaxID != ops.max_id && i < 16);
  Logger.log("Iterations: %s", i)
  return ret;
};

function GetResponses(usrid)
{
  //Get all mentions then filter out those that respond to a tweet by the usr
  oauthSetup();
  var ret = []
  var op = {
    "oAuthServiceName" : "twitter",
    "oAuthUseToken" : "always",
    'include_rts' : true
  };
  var count_str = "200";
  var max_id = -1;
  var max_id_str = "";
  var min_id = 1;
  var min_id_str = "1";
  
  var lastMaxID = -1;
  
  var R = [];
  var processed = {};
  
  
  R = try_fetch("https://api.twitter.com/1.1/statuses/mentions_timeline.json?count="+ count_str +"&since_id="+min_id_str, op, 16);
  
  var i = 0;
  do
  {
    //op['since_id'] = R[R.length-1]['id_str'];
    lastMaxID = max_id;
    for (var x in R)
    {
      if (R[x]['in_reply_to_user_id'] == usrid && R[x]['in_reply_to_status_id_str'] != null)
      {
        Logger.log("\t->MID: %s", op.since_id)
        if(R[x].id < max_id) {
          max_id = R[x].id;
          max_id_str = R[x].id_str;
        }
        if (!processed[R[x].id_str]) {
          ret.push({id:R[x]['user']['id_str'], text:R[x]['text'], in_reply_to:R[x]['in_reply_to_status_id_str'], name:R[x]['user']['name']});
        }
      }
    }
    
    try_fetch("https://api.twitter.com/1.1/statuses/mentions_timeline.json?count="+ count_str +"&since_id="+ min_id_str +"&max_id="+ max_id_str, op, 16);
    
  } while (lastMaxID != max_id && i < 32);
  Logger.log("Length of Responses: %s", ret.length);
  return ret;
};

function updateSheet(e) 
{
  var doc = SpreadsheetApp.openByUrl(PropertiesService.getUserProperties().getProperty('doc_url'));
  doc.getRange('a1').setValue('Dates:');
  var dates = doc.getRange('b1:c1').getValues()[0];
  
  var usr_info = setUser();
  //Get relevant info
  var Questions = GetQuestions(Date.parse(dates[0]), Date.parse(dates[1]), usr_info.usr_id, usr_info.numstats);//{id:?, {text:<string>, index:<int>}}
  //return;
  var Responses = GetResponses(usr_info.usr_id);//[{id:<string>, text:<string>, in_reply_to:<string>, name:<string>]
  
  //create object to store information about users
  var Users = {};//{usr_id_str:{name:<string>, index:<int>}}
  var UserIndex = 1;
  
  Logger.log(Questions);
  Logger.log(Responses);
  
  var cols = 1;
  var cell = doc.getRange('a2');
  var index = 0;
  
  doc.getDataRange().offset(1, 0).clear({contentsOnly:true});
  
  cell.setValue("Questions/People");
  
  for(var q in Questions)
  {
    cell.offset(Questions[q].index, 0).setValue(Questions[q].text);
  }
  for(var r in Responses)
  {
    if (Questions[Responses[r].in_reply_to] != null) {
      if (Users[Responses[r].id] == null)
      {
        Users[Responses[r].id] = {name:Responses[r].name, index:UserIndex++};
        cell.offset(0, Users[Responses[r].id].index).setValue(Responses[r].name);
      }
      var ans = Responses[r].text;
      var patt = /@\S+\s/;
      cell.offset(Questions[Responses[r].in_reply_to].index, Users[Responses[r].id].index).setValue(ans.replace(patt.exec(ans), ""));
    }
  }
  var app = UiApp.getActiveApplication();
  app.add(app.createLabel('Update Complete'));
  return app;
};













