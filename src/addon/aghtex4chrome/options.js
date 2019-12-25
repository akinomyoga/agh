window.addEventListener('DOMContentLoaded', function() {
  var options = document.getElementsByTagName('input');
  function loadOptions() {
    var defaultSetting = {
      enableTeXFile: true,
      enableGmail: true,
      enableGoogleGroups: true,
      enableGoogleSites: true,
      enableGitHub: true
    };
    chrome.storage.sync.get(defaultSetting, function (setting) {
      //console.log("loaded");
      for (var i = 0; i < options.length; i++) {
        var input = options[i];
        if (input.name in setting)
          input.checked = setting[input.name];
      }
    });
  }
  loadOptions();

  for (var i = 0; i < options.length; i++) {
    options[i].addEventListener('change', function(event) {
      var input = event.target;
      var setting = {};
      setting[input.name] = input.checked;
      input.style.backgroundColor = '#ddd';
      chrome.storage.sync.set(setting, function() {
        //console.log("saved " + input.name);
        input.style.backgroundColor = 'inherit';
      });
    });
  }
});
