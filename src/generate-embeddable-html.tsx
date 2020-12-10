// This function returns string with HTML content of the Lab interactive page.
// Note that list of dependencies and some implementation details are based on lab/embeddable.html file.
// This version is different mostly to keep it as small as possible, provide labDistPath, and the fact
// that it's used via srcDoc attribute.
export const generateEmbeddableHTML = (labDistPath = "lab/") => `
  <!doctype html>
  <html>
  <head>
    <meta content="text/html;charset=utf-8" http-equiv="Content-Type">
    <meta content="IE=edge,chrome=1" http-equiv="X-UA-Compatible">
    <link href="${labDistPath}lab/vendor/jquery-ui/jquery-ui.min.css" rel="stylesheet">
    <link href="${labDistPath}lab/lab-fonts.css" rel="stylesheet">
    <link href="${labDistPath}lab/lab.css" rel="stylesheet">
    <link href='${labDistPath}themes/cc-themes.css' rel='stylesheet' type='text/css'>
    <script src="${labDistPath}lab/vendor/jquery/jquery.min.js"></script>
    <script src="${labDistPath}lab/vendor/jquery-ui/jquery-ui.min.js"></script>
    <title>Lab Interactive</title>
    <style>
      * {
        -webkit-box-sizing: border-box;
        -moz-box-sizing: border-box;
        box-sizing: border-box
      }
      html, body {
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
        margin: 0;
        padding: 0
      }
    </style>
  </head>
  <body>
  <div id="interactive-container" tabindex="0"></div>
  <script src="${labDistPath}lab/lab.min.js"></script>
  <script>
    Lab.config.rootUrl = "${labDistPath}lab";
    // sharing won't work so disable it
    Lab.config.sharing = false;
    // Keep Embeddable namespace to be consistent with lab/embeddable.html
    window.Embeddable = {
      controller: new Lab.InteractivesController(null, '#interactive-container')
    };
  </script>
  </body>
  </html>
`;
