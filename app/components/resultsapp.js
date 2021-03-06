var React = require('react');
var fetchJsonp = require('fetch-jsonp');
var queryString = require('query-string');
var Navbar = require("../components/navbar").Navbar;
var Search = require("../components/search").Search;
var Results = require("../components/results").Results;
var Config = require("../config/config").Config; 


export var ResultsApp = React.createClass({
  getInitialState: function() {
    return {
      results: [],
      resultsBackground: [],
      urlBase: Config.API_URL,
      urlQuery: "",
    };
  },

  goLive: function(){
      this.timerID = setInterval(() => this.refresh(), Config.REFRESH);
      $("#timer-id").text(this.timerID);
      $("#live-info").show();
  },

  endLive: function(){
      $("#live-info").hide();
      var timerID = $("#timer-id").text();
      if(timerID != ""){
          $("#timer-id").text("");
          clearInterval(timerID);
      }
  },

  atTop: function(){
    return $(window).scrollTop() == 0;
  },

  componentDidMount: function(){
    if($.isEmptyObject(queryString.parse(location.search))) {
      this.refresh();
    }
    this.goLive();

    //wrong place?
    $(window).scroll(function() {
      if(this.atTop()) this.refresh();
    }.bind(this));
  },
  
  componentWillUnmount: function(){
    //this.endLive();
  },

  handleSearch: function(url){
    this.setState({urlQuery: url, results: []}, function(){
      this.refresh([],"");
    }.bind(this));
    history.pushState(null,null,"/results"+url);
  },

  handeData: function(data){
    if(this.state.results.length > 0) {
      var newestID = this.state.resultsBackground[0].id;
      console.log(newestID);
      console.log(data.filter(function(result){ return result.id > newestID}));
      return data.filter(function(result){ return result.id > newestID});
    } else {
      return data;
    }
  },

  refresh: function(accumulator = [], url = ""){
    if(url==""){
      url = this.state.urlBase+this.state.urlQuery;
    }
    $("#spinner").show();
    fetchJsonp(url)
    .then(function(response) {
      return response.json()
    }).then(function(json) {
      console.log("refreshing the state");
      var newData = this.handeData(json.data);
      if(this.state.results.length == 0){
          console.log("results were empty, setting the state");
          this.setState({results: newData, resultsBackground: newData});
      } else {
        if(newData.length == 0){
          console.log("no new/more data");
          this.setState((prevState, props) => {
            var newResultsBackground = accumulator.concat(prevState.resultsBackground);
            if(this.atTop()){
              console.log("syncing results with resultsBackground");
              $("#new-results-info").hide();
              return {
                results: newResultsBackground,
                resultsBackground: newResultsBackground
              }
            } else {
              if(newResultsBackground.length != prevState.results.length)
                $("#new-results-info").show();
              return {resultsBackground: newResultsBackground}
            }
          });
        } else {
          //FIXME handle null next page
          var next = json.next.replace(/[\?&]callback=[^\?]*/gi,"").replace(/\?page/,"&page").replace(/results&page/,"results?page"); //temporary fix
          console.log(next);
          this.refresh(accumulator.concat(newData), next);
          // ^^^^
        }
      }
      $("#spinner").hide();
    }.bind(this))
    .catch(function(ex) {
      console.log('parsing failed', ex)
    });

  },

  loadMoreWrapper: function(){
    var oldestID = this.state.results[this.state.results.length - 1].id;
    this.loadMore(oldestID);
  },

  loadMore: function(oldestID, url = "") {
      if(url==""){
        url = this.state.urlBase+this.state.urlQuery;
      }
      console.log(url);
      $("#spinner").show();
      fetchJsonp(url)
      .then(function(response) {
        return response.json()
      }).then(function(json) {
        console.log(json);
        var newData = json.data.filter(function(result){return result.id < oldestID});
        console.log(newData);
        if(newData.length != 0){
            //render
            this.setState({results: this.state.results.concat(newData)});
            $("#spinner").hide();
        } else {
            //throw away, go next
            if(json.next == null){
              alert("no moar data"); //FIXME change to something more elegant
              $("#spinner").hide();
            } else {
              var next = json.next.replace(/[\?&]callback=[^\?]*/gi,"").replace(/\?page/,"&page").replace(/results&page/,"results?page"); //temporary fix
              console.log(next);
              this.loadMore(oldestID, next);
            }
        }
      }.bind(this))
      .catch(function(ex) {
        console.log('parsing failed', ex)
      });

  },

  render: function() {
    return (
      <div>
        <Navbar />
        <div className="text-center container">
          <Search onSubmit={this.handleSearch}/>
          <br />
          <Results results={this.state.results} />
          <br />
          <button type="button" className="btn btn-default more" onClick={this.loadMoreWrapper}>
            <i className="fa fa-ellipsis-v" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    )
  }
});