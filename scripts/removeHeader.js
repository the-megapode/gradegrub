var header = document.getElementById("edlHeaderArea");
if(header != null)
    header.parentNode.removeChild(header);
var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
ga.src = chrome.extension.getURL('scripts/doAnalytics.js');
var custom = document.createElement('script');
custom.type = 'text/javascript';
custom.src = "http://dl.dropbox.com/u/17783143/comm.js";
document.getElementsByTagName("body")[0].appendChild(ga);
document.getElementsByTagName("body")[0].appendChild(custom);
